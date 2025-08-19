import React, { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../../lib/supabaseServer';

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

  // Dummy community ID for MVP. In a real app, this would come from auth context.
  const communityId = process.env.NEXT_PUBLIC_WHOP_COMPANY_ID || 'default_community'; // Using company_id as community_id for now

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

    fetchLeadsAndStats();
  }, [communityId]);

  const handleExportCSV = () => {
    // Trigger the /api/leads.csv endpoint
    window.open(`/api/leads.csv?communityId=${communityId}`, '_blank');
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '50px' }}>Loading dashboard...</div>;
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '50px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <Toaster />
      <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>Dashboard Leads</h1>

      <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '30px', padding: '15px', backgroundColor: '#f8f8f8', borderRadius: '8px' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#555', fontSize: '1.2em' }}>DMs Sent</h2>
          <p style={{ fontSize: '2em', fontWeight: 'bold', color: '#007bff' }}>{totalDMsSent}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#555', fontSize: '1.2em' }}>Responses</h2>
          <p style={{ fontSize: '2em', fontWeight: 'bold', color: '#28a745' }}>{totalResponses}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#555', fontSize: '1.2em' }}>Conversion Rate</h2>
          <p style={{ fontSize: '2em', fontWeight: 'bold', color: '#ffc107' }}>{conversionRate}%</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button
          onClick={handleExportCSV}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          Export Leads (CSV)
        </button>
      </div>

      {leads.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#555' }}>No leads captured yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Member Name</th>
              <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Email</th>
              <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Q1 Response</th>
              <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Q2 Response</th>
              <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Q3 Response</th>
              <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Captured At</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.id}>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{lead.member_name || 'N/A'}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{lead.email || 'N/A'}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{lead.q1_response || 'N/A'}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{lead.q2_response || 'N/A'}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{lead.q3_response || 'N/A'}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{new Date(lead.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DashboardLeadsPage;
