// lib/whopGraph.ts
// Server-only Whop GraphQL API utilities

export async function postGraphQL<T = any>(query: string, variables: any) {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    return { 
      status: 500, 
      jsonText: "", 
      json: undefined,
      error: "Missing WHOP_API_KEY" 
    } as const;
  }
  
  const res = await fetch("https://api.whop.com/graphql", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      "X-API-KEY": apiKey 
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  
  const status = res.status;
  const jsonText = await res.text();
  let json: any = undefined;
  
  try { 
    json = JSON.parse(jsonText); 
  } catch {} 
  
  return { status, jsonText, json, error: undefined };
}

export async function postWhopGraph(query: string, variables?: any) {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    return { 
      status: 500, 
      ok: false, 
      text: "Missing WHOP_API_KEY",
      json: undefined
    };
  }
  
  try {
    const res = await fetch("https://api.whop.com/graphql", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "X-API-KEY": apiKey 
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });
    
    const status = res.status;
    const ok = res.ok;
    const text = await res.text();
    let json: any = undefined;
    
    try {
      json = JSON.parse(text);
    } catch {}
    
    return { status, ok, text, json };
  } catch (error: any) {
    return {
      status: 500,
      ok: false,
      text: `Fetch error: ${error?.message || 'Unknown error'}`,
      json: undefined
    };
  }
}

export function ensureEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
