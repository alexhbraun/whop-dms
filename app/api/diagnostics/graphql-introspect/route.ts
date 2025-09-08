// app/api/diagnostics/graphql-introspect/route.ts
import { NextResponse } from "next/server";
import { postGraphQL } from "@/lib/whopGraph";
import { requireAdminSecret } from "@/lib/admin-auth";

export const runtime = 'nodejs';

export async function GET(req: Request) {
  requireAdminSecret(req);
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
    const result = await postGraphQL(q, {});
    
    console.log("[introspect] result:", {
      status: result.status,
      hasError: !!result.error,
      responseLength: result.jsonText.length,
      hasJson: !!result.json
    });
    
    if (result.error) {
      console.log("[introspect] API key missing or other error:", result.error);
      return NextResponse.json({ 
        ok: false, 
        error: result.error 
      }, { status: result.status });
    }
    
    if (!result.json) {
      console.log("[introspect] non-JSON response received:", result.jsonText.slice(0, 500));
      return NextResponse.json({ 
        ok: false, 
        error: "Non-JSON response", 
        raw: result.jsonText 
      }, { status: result.status });
    }
    
    console.log("[introspect] parsed JSON response:", {
      hasData: !!result.json.data,
      hasSchema: !!result.json.data?.__schema,
      hasMutations: !!result.json.data?.__schema?.mutationType,
      hasQueries: !!result.json.data?.__schema?.queryType
    });
    
    const mutations = result.json?.data?.__schema?.mutationType?.fields?.map((f: any) => f.name) ?? [];
    const queries = result.json?.data?.__schema?.queryType?.fields?.map((f: any) => f.name) ?? [];
    
    console.log("[introspect] extracted mutations:", mutations.length);
    console.log("[introspect] extracted queries:", queries.length);
    
    return NextResponse.json({ 
      ok: true, 
      status: result.status, 
      mutations, 
      queries, 
      raw: mutations.length ? undefined : result.json 
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
