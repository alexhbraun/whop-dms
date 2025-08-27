// app/api/diagnostics/whop-schema/route.ts
import { NextResponse } from "next/server";
import { postWhopGraph } from "@/lib/whopGraph";

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ 
    ok: true, 
    info: "POST to introspect schema" 
  });
}

export async function POST() {
  console.log("[whop-schema] Starting schema introspection");
  
  try {
    // Check if API key is available
    if (!process.env.WHOP_API_KEY) {
      console.error("[whop-schema] Missing WHOP_API_KEY environment variable");
      return NextResponse.json({ 
        ok: false, 
        error: "Missing WHOP_API_KEY environment variable" 
      }, { status: 500 });
    }
    
    console.log("[whop-schema] WHOP_API_KEY is present, proceeding with schema checks");
    
    // 1. Basic sanity query
    console.log("[whop-schema] Running basic sanity query: __typename");
    const sanityResult = await postWhopGraph("query { __typename }");
    console.log("[whop-schema] Sanity query result:", {
      status: sanityResult.status,
      ok: sanityResult.ok,
      bodyPreview: sanityResult.text.slice(0, 200)
    });
    
    // 2. Schema probe query
    console.log("[whop-schema] Running schema probe query");
    const probeResult = await postWhopGraph("query { __schema { queryType { name } } }");
    console.log("[whop-schema] Schema probe result:", {
      status: probeResult.status,
      ok: probeResult.ok,
      bodyPreview: probeResult.text.slice(0, 200)
    });
    
    // 3. Full mutation introspection
    console.log("[whop-schema] Running full mutation introspection");
    const mutationResult = await postWhopGraph(`
      query IntrospectMutations {
        __schema {
          mutationType {
            name
            fields {
              name
            }
          }
        }
      }
    `);
    
    console.log("[whop-schema] Mutation introspection result:", {
      status: mutationResult.status,
      ok: mutationResult.ok,
      bodyPreview: mutationResult.text.slice(0, 200)
    });
    
    // Extract mutation fields
    let mutationsSample: string[] = [];
    let mutationFieldsCount = 0;
    
    if (mutationResult.json?.data?.__schema?.mutationType?.fields) {
      const fields = mutationResult.json.data.__schema.mutationType.fields;
      mutationFieldsCount = fields.length;
      mutationsSample = fields.slice(0, 50).map((f: any) => f.name);
      
      console.log("[whop-schema] Extracted mutations:", {
        totalCount: mutationFieldsCount,
        sampleCount: mutationsSample.length,
        firstFew: mutationsSample.slice(0, 5)
      });
    } else {
      console.log("[whop-schema] No mutation fields found in response");
    }
    
    // 4. Check for DM candidates
    const dmCandidates = {
      sendDirectMessageToUser: mutationsSample.includes("sendDirectMessageToUser"),
      messagesSendDirectMessageToUser: mutationsSample.includes("messagesSendDirectMessageToUser"),
      sendDirectMessage: mutationsSample.includes("sendDirectMessage"),
      sendMessageToUser: mutationsSample.includes("sendMessageToUser")
    };
    
    console.log("[whop-schema] DM candidates check:", dmCandidates);
    
    // 5. Prepare response
    const response = {
      ok: true,
      hasKey: true,
      schemaProbe: {
        status: probeResult.status,
        ok: probeResult.ok
      },
      mutationFieldsCount,
      mutationsSample,
      dmCandidates
    };
    
    console.log("[whop-schema] Final response:", {
      ok: response.ok,
      hasKey: response.hasKey,
      mutationFieldsCount: response.mutationFieldsCount,
      dmCandidatesFound: Object.values(dmCandidates).filter(Boolean).length
    });
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error("[whop-schema] Error during schema introspection:", {
      error: error?.message || 'Unknown error',
      errorType: error?.constructor?.name || 'unknown',
      hasStack: !!error?.stack
    });
    
    return NextResponse.json({ 
      ok: false, 
      error: error?.message ?? 'Failed to introspect Whop schema' 
    }, { status: 500 });
  }
}
