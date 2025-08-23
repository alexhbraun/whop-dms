import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../../lib/supabaseServer';
import { useCommunitySettings } from '../../pages/_app'; // Import useCommunitySettings
import { useRouter } from 'next/router'; // Import useRouter

interface Lead {
  id: string;
  member_name: string;
  email: string;
  q1_response: string;
  q2_response: string;
  q3_response: string;
  created_at: string;
}

const DashboardLeadsPage = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalDMsSent, setTotalDMsSent] = useState(0);
  const [totalResponses, setTotalResponses] = useState(0);
  const [conversionRate, setConversionRate] = useState('0.00');
  const communitySettings = useCommunitySettings(); // Use custom settings

  // Dummy community ID for MVP. In a real app, this would come from auth context.
  // Use communityId from router query or auth context instead of env variable
  const router = useRouter();
  const communityId = (router.query.community_id as string) || process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'default_community';

  useEffect(() => {
    const fetchLeadsAndStats = async () => {
      // Fetch leads
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id, member_name, email, q1_response, q2_response, q3_response, created_at')
        .eq('community_id', communityId);

      if (leadsError) {
        console.error('Error fetching leads:', leadsError);
        toast.error('Error loading leads.');
        setLoading(false);
        return;
      }
      setLeads(leadsData || []);

      // Fetch DM send counts
      const { count: dmCount, error: dmCountError } = await supabase
        .from('dm_sends')
        .select('id', { count: 'exact' })
        .eq('community_id', communityId);

      if (dmCountError) {
        console.error('Error fetching DM count:', dmCountError);
        toast.error('Error loading DM count.');
        setLoading(false);
        return;
      }
      setTotalDMsSent(dmCount || 0);

      // Calculate responses (leads where at least one question is answered, or email is provided)
      const responsesCount = leadsData?.filter(lead =>
        lead.email || lead.q1_response || lead.q2_response || lead.q3_response
      ).length || 0;
      setTotalResponses(responsesCount);

      // Calculate conversion rate
      if (dmCount && dmCount > 0) {
        setConversionRate(((responsesCount / dmCount) * 100).toFixed(2));
      } else {
        setConversionRate('0.00');
      }

      setLoading(false);
    };

    if (communityId !== 'default_community') { // Only fetch if communityId is valid
      fetchLeadsAndStats();
    }

  }, [communityId]);

  const handleExportCSV = () => {
    // Trigger the /api/leads.csv endpoint
    window.open(`/api/leads.csv?community_id=${communityId}`, '_blank');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-neutral-600 text-lg">Loading dashboard...</p></div>;
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4 sm:p-6 lg:p-8">
      <Toaster />
      <main className="max-w-6xl mx-auto bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-center text-4xl font-serif font-bold text-neutral-900 mb-8"
            style={{ color: communitySettings?.primary_color || undefined }}>
          {communitySettings?.welcome_message_title ? `${communitySettings.welcome_message_title} Leads` : 'Dashboard Leads'}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-primary-50 p-6 rounded-lg shadow-md text-center border-l-4 border-primary-500">
            <h2 className="text-lg font-semibold text-primary-700 mb-2">DMs Sent</h2>
            <p className="text-4xl font-bold text-primary-800">{totalDMsSent}</p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg shadow-md text-center border-l-4 border-green-500">
            <h2 className="text-lg font-semibold text-green-700 mb-2">Responses</h2>
            <p className="text-4xl font-bold text-green-800">{totalResponses}</p>
          </div>
          <div className="bg-yellow-50 p-6 rounded-lg shadow-md text-center border-l-4 border-yellow-500">
            <h2 className="text-lg font-semibold text-yellow-700 mb-2">Conversion Rate</h2>
            <p className="text-4xl font-bold text-yellow-800">{conversionRate}%</p>
          </div>
        </div>

        <div className="flex justify-end mb-6">
          <button onClick={handleExportCSV} className="btn-secondary">
            Export Leads (CSV)
          </button>
        </div>

        {leads.length === 0 ? (
          <p className="text-center text-neutral-600 text-lg py-10">No leads captured yet for this community.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow-md border border-neutral-200">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Member Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Q1 Response</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Q2 Response</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Q3 Response</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">Captured At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-neutral-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">{lead.member_name || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{lead.email || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{lead.q1_response || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{lead.q2_response || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{lead.q3_response || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">{new Date(lead.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardLeadsPage;
