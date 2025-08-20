import Head from 'next/head';

export default function Landing() {
  return (
    <>
      <Head><title>Whop DMS — Landing</title></Head>
      <main style={{maxWidth: 960, margin: '40px auto', padding: 24, fontFamily:'Inter, system-ui'}}>
        <h1 style={{marginBottom: 8}}>Whop DMS</h1>
        <p style={{color:'#555', marginBottom: 24}}>
          Capture leads, configure sua integração com o Whop e acompanhe resultados.
        </p>
        <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
          <a href="/app" style={btn}>Ir para o App</a>
          <a href="/whop/settings" style={btnSecondary}>Configurar</a>
          <a href="/dashboard/leads" style={btnSecondary}>Ver Leads</a>
        </div>
      </main>
    </>
  );
}

const btn: React.CSSProperties = { padding:'10px 16px', background:'#111827', color:'#fff', borderRadius:8, textDecoration:'none' };
const btnSecondary: React.CSSProperties = { padding:'10px 16px', background:'#e5e7eb', color:'#111', borderRadius:8, textDecoration:'none' };

