import Head from 'next/head';
import { useCommunitySettings } from './_app';

export default function Landing() {
  const communitySettings = useCommunitySettings();

  const btn: React.CSSProperties = {
    padding: '10px 16px',
    background: communitySettings?.primary_color || '#111827',
    color: '#fff',
    borderRadius: 8,
    textDecoration: 'none',
  };

  const btnSecondary: React.CSSProperties = {
    padding: '10px 16px',
    background: communitySettings?.secondary_color || '#e5e7eb',
    color: communitySettings?.primary_color || '#111',
    borderRadius: 8,
    textDecoration: 'none',
  };

  return (
    <>
      <Head><title>Whop DMS — Landing</title></Head>
      <main style={{ maxWidth: 960, margin: '40px auto', padding: 24, fontFamily: 'Inter, system-ui' }}>
        {communitySettings?.logo_url && (
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img src={communitySettings.logo_url} alt="Community Logo" style={{ maxWidth: '150px' }} />
          </div>
        )}
        <h1 style={{ marginBottom: 8, color: communitySettings?.primary_color || '#111827' }}>
          {communitySettings?.welcome_message_title || 'Whop DMS'}
        </h1>
        <p style={{ color: communitySettings?.primary_color || '#555', marginBottom: 24 }}>
          {communitySettings?.welcome_message_body || 'Capture leads, configure sua integração com o Whop e acompanhe resultados.'}
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="/app" style={btn}>Ir para o App</a>
          <a href="/whop/settings" style={btnSecondary}>Configurar</a>
          <a href="/dashboard/leads" style={btnSecondary}>Ver Leads</a>
        </div>
      </main>
    </>
  );
}

