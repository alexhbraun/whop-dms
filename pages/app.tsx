import Head from 'next/head';

export default function AppHome() {
  return (
    <>
      <Head>
        <title>Whop DMS — App</title>
      </Head>
      <main className="container mx-auto px-4 py-12 md:py-16 lg:py-20 bg-neutral-50 min-h-screen">
        <h1 className="text-center mb-4 md:mb-6">Bem-vindo ao seu painel</h1>
        <p className="text-center text-lg text-neutral-600 mb-8 max-w-2xl mx-auto">
          Esta é a página que os criadores veem após instalar o app pelo Whop.
        </p>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <a href="/whop/settings" className="block p-6 border border-neutral-200 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 bg-white text-neutral-800 hover:text-primary-600 hover:border-primary-300 group">
            <h2 className="text-xl font-semibold mb-2 group-hover:text-primary-700">Configurar App</h2>
            <p className="text-neutral-500 text-sm">Ajuste as configurações gerais da sua aplicação Whop.</p>
          </a>
          <a href="/dashboard/leads" className="block p-6 border border-neutral-200 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 bg-white text-neutral-800 hover:text-primary-600 hover:border-primary-300 group">
            <h2 className="text-xl font-semibold mb-2 group-hover:text-primary-700">Ver Leads</h2>
            <p className="text-neutral-500 text-sm">Visualize e exporte os leads capturados pela sua comunidade.</p>
          </a>
          <a href="/api/health" className="block p-6 border border-neutral-200 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 bg-white text-neutral-800 hover:text-primary-600 hover:border-primary-300 group">
            <h2 className="text-xl font-semibold mb-2 group-hover:text-primary-700">Health Check</h2>
            <p className="text-neutral-500 text-sm">Verifique o status de saúde e a conectividade da aplicação.</p>
          </a>
        </section>
      </main>
    </>
  );
}

