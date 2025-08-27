// app/api/diagnostics/graphql-introspect/route.ts
import { NextResponse } from "next/server";
import { postGraphQL } from "@/lib/whopGraph";

export const runtime = 'nodejs';

export async function GET() {
  console.log("[introspect] start");
  
  try {
    const q = `
      query Introspect {
        __schema {
          mutationType { fields { name } }
          queryType { fields { name } }
        }
      }
    `;
    
    console.log("[introspect] calling Whop GraphQL with introspection query");
    const { status, jsonText, json } = await postGraphQL(q, {});
    
    console.log("[introspect] status", status);
    console.log("[introspect] response length", jsonText.length);
    
    if (!json) {
      console.log("[introspect] non-JSON response received:", jsonText.slice(0, 500));
      return NextResponse.json({ 
        ok: false, 
        error: "Non-JSON response", 
        raw: jsonText 
      }, { status });
    }
    
    console.log("[introspect] parsed JSON response:", {
      hasData: !!json.data,
      hasSchema: !!json.data?.__schema,
      hasMutations: !!json.data?.__schema?.mutationType,
      hasQueries: !!json.data?.__schema?.queryType
    });
    
    const mutations = json?.data?.__schema?.mutationType?.fields?.map((f: any) => f.name) ?? [];
    const queries = json?.data?.__schema?.queryType?.fields?.map((f: any) => f.name) ?? [];
    
    console.log("[introspect] extracted mutations:", mutations.length);
    console.log("[introspect] extracted queries:", queries.length);
    
    return NextResponse.json({ 
      ok: true, 
      status, 
      mutations, 
      queries, 
      raw: mutations.length ? undefined : json 
    }, { status: 200 });
    
  } catch (error: any) {
    console.error("[introspect] error during introspection:", {
      error: error?.message || 'Unknown error',
      errorType: error?.constructor?.name || 'unknown',
      hasStack: !!error?.stack
    });
    
    return NextResponse.json({ 
      ok: false, 
      error: error?.message ?? 'Failed to introspect schema' 
    }, { status: 500 });
  }
}
