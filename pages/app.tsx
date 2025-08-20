import Head from 'next/head';

export default function AppHome() {
  return (
    <>
      <Head>
        <title>Whop DMS — App</title>
      </Head>
      <main style={{maxWidth: 960, margin: '40px auto', padding: 24, fontFamily: 'Inter, system-ui'}}>
        <h1 style={{marginBottom: 8}}>Bem-vindo ao seu painel</h1>
        <p style={{color: '#555', marginBottom: 24}}>
          Esta é a página que os criadores veem após instalar o app pelo Whop.
        </p>

        <section style={{display:'grid', gap:16, gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))'}}>
          <a href="/whop/settings" style={card}>Configurar App</a>
          <a href="/dashboard/leads" style={card}>Ver Leads</a>
          <a href="/api/health" style={card}>Health Check</a>
        </section>
      </main>
    </>
  );
}

const card: React.CSSProperties = {
  display:'block',
  padding:16,
  border:'1px solid #e5e7eb',
  borderRadius:12,
  textDecoration:'none',
  color:'#111',
  background:'#fff'
};
