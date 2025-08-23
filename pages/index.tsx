import Head from 'next/head';
import { useCommunitySettings } from './_app';

export default function Landing() {
  const communitySettings = useCommunitySettings();

  return (
    <>
      <Head><title>{communitySettings?.welcome_message_title || 'Whop DMS — Landing'}</title></Head>
      <main className="relative min-h-screen bg-gradient-to-br from-primary-50 to-neutral-100 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl w-full text-center bg-white p-8 rounded-xl shadow-lg transform transition-all duration-300 hover:scale-[1.01]">
          {communitySettings?.logo_url && (
            <div className="mb-10">
              <img
                src={communitySettings.logo_url}
                alt="Community Logo"
                className="mx-auto max-w-[180px] h-auto rounded-lg shadow-md border border-neutral-200"
              />
            </div>
          )}
          <h1 className="text-5xl md:text-6xl font-extrabold text-neutral-900 mb-6 leading-tight"
              style={{ color: communitySettings?.primary_color || undefined }}>
            {communitySettings?.welcome_message_title || 'Whop DMS: Elevate Your Community Experience'}
          </h1>
          <p className="text-xl md:text-2xl text-neutral-700 mb-10 leading-relaxed"
             style={{ color: communitySettings?.primary_color ? `${communitySettings.primary_color}d0` : undefined }}> {/* Slightly transparent primary color */}
            {communitySettings?.welcome_message_body || 'Capture leads, configure your Whop integration, and track results to empower your community and grow your business.'}
          </p>
          <div className="flex flex-col items-center justify-center gap-5 sm:flex-row">
            <a href="/app" className="btn text-lg px-8 py-3 transform hover:scale-105 transition-transform duration-200"
               style={{ backgroundColor: communitySettings?.primary_color || undefined }}>
              Ir para o App
            </a>
            <a href={communitySettings?.community_id ? `/dashboard/settings?community_id=${communitySettings.community_id}` : "#"}
               className="btn-secondary text-lg px-8 py-3 transform hover:scale-105 transition-transform duration-200"
               style={{
                 backgroundColor: communitySettings?.secondary_color || undefined,
                 color: communitySettings?.primary_color || undefined,
               }}
               onClick={(e) => {
                 if (!communitySettings?.community_id) {
                   e.preventDefault();
                   alert("Community ID not available. Please ensure your app is installed or refresh the page.");
                 }
               }}>
              Configurar
            </a>
            <a href="/dashboard/leads" className="btn-secondary text-lg px-8 py-3 transform hover:scale-105 transition-transform duration-200"
               style={{
                 backgroundColor: communitySettings?.secondary_color || undefined,
                 color: communitySettings?.primary_color || undefined,
               }}>
              Ver Leads
            </a>
          </div>
        </div>
      </main>
    </>
  );
}

