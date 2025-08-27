// app/api/diagnostics/try-dm-graph/route.ts
import { NextResponse } from "next/server";
import { postGraphQL } from "@/lib/whopGraph";

export const runtime = 'nodejs';

type Body = { 
  recipientUsername?: string; 
  recipientUserId?: string; 
  message?: string 
};

type AttemptResult = {
  name: string;
  success: boolean;
  httpStatus: number;
  hasErrors: boolean;
  dataKeys?: string[];
  errorMessages?: string[];
  id?: string;
};

export async function POST(req: Request) {
  console.log("[try-dm-graph] start");
  
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const msg = (body.message ?? "").toString();
    
    console.log("[try-dm-graph] request body:", {
      hasRecipientUsername: !!body.recipientUsername,
      hasRecipientUserId: !!body.recipientUserId,
      hasMessage: !!body.message,
      messageLength: msg.length
    });
    
    const recipient = body.recipientUserId
      ? { type: "userId" as const, value: body.recipientUserId }
      : body.recipientUsername
        ? { type: "username" as const, value: body.recipientUsername.replace(/^@/, "") }
        : null;
        
    if (!recipient) {
      console.log("[try-dm-graph] validation failed: missing recipient");
      return NextResponse.json({ 
        ok: false, 
        error: "recipientUsername or recipientUserId required" 
      }, { status: 400 });
    }
    
    if (!msg) {
      console.log("[try-dm-graph] validation failed: missing message");
      return NextResponse.json({ 
        ok: false, 
        error: "message required" 
      }, { status: 400 });
    }

    console.log("[try-dm-graph] using recipient:", {
      type: recipient.type,
      value: recipient.value,
      messageLength: msg.length
    });

    const candidates = [
      {
        name: "sendDirectMessageToUser",
        query: `
          mutation SendDM($to:String!,$msg:String!){
            sendDirectMessageToUser(toUserIdOrUsername:$to, message:$msg){ id }
          }
        `,
        vars: (to: string) => ({ to, msg: msg })
      },
      {
        name: "messagesSendDirectMessageToUser",
        query: `
          mutation SendDM2($to:String!,$msg:String!){
            messagesSendDirectMessageToUser(toUserIdOrUsername:$to, message:$msg){ id }
          }
        `,
        vars: (to: string) => ({ to, msg: msg })
      },
      {
        name: "sendDirectMessage(input)",
        query: `
          mutation SendDM3($input: SendDirectMessageInput!){
            sendDirectMessage(input:$input){ id }
          }
        `,
        vars: (to: string) => ({ input: { toUserIdOrUsername: to, message: msg } })
      },
      {
        name: "sendMessageToUser",
        query: `
          mutation SendDM4($to:String!,$msg:String!){
            sendMessageToUser(toUserIdOrUsername:$to, message:$msg){ id }
          }
        `,
        vars: (to: string) => ({ to, msg: msg })
      },
    ];

    const to = recipient.value;
    const tried: AttemptResult[] = [];
    let winner: AttemptResult | undefined;

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      console.log(`[try-dm-graph] attempting ${i + 1}/${candidates.length}:`, c.name);
      
      const result = await postGraphQL(c.query, c.vars(to));
      
      const r: AttemptResult = { 
        name: c.name, 
        success: false, 
        httpStatus: result.status, 
        hasErrors: false 
      };
      
      console.log(`[try-dm-graph] ${c.name} response:`, {
        status: result.status,
        responseLength: result.jsonText.length,
        hasJson: !!result.json,
        hasError: !!result.error
      });
      
      if (result.error) {
        r.errorMessages = [result.error];
        tried.push(r);
        console.log(`[try-dm-graph] ${c.name} failed: API error -`, result.error);
        continue;
      }
      
      if (!result.json) {
        r.errorMessages = [`non-json: ${result.jsonText.slice(0, 200)}`];
        tried.push(r);
        console.log(`[try-dm-graph] ${c.name} failed: non-JSON response`);
        continue;
      }
      
      const errors = Array.isArray(result.json.errors) ? result.json.errors : [];
      r.hasErrors = errors.length > 0;
      
      if (errors.length) {
        r.errorMessages = errors.map((e: any) => e?.message ?? JSON.stringify(e)).slice(0, 5);
        console.log(`[try-dm-graph] ${c.name} has errors:`, r.errorMessages);
      }
      
      const dataObj = result.json.data ?? {};
      const dataKeys = Object.keys(dataObj);
      r.dataKeys = dataKeys;
      
      console.log(`[try-dm-graph] ${c.name} data keys:`, dataKeys);
      
      let id: string | undefined;
      for (const k of dataKeys) {
        const v = dataObj[k];
        if (v && typeof v === "object" && typeof v.id === "string") { 
          id = v.id; 
          break; 
        }
      }
      
      if (id && !errors.length) {
        r.success = true;
        r.id = id;
        winner = r;
        console.log(`[try-dm-graph] ${c.name} SUCCESS! Message ID:`, id);
        tried.push(r);
        break;
      }
      
      tried.push(r);
      console.log(`[try-dm-graph] ${c.name} failed or no ID found`);
    }

    const finalResult = {
      ok: !!winner,
      recipient,
      messageLength: msg.length,
      tried,
      winner: winner ? { name: winner.name, id: winner.id } : undefined,
    };
    
    console.log("[try-dm-graph] final result:", {
      ok: finalResult.ok,
      winner: finalResult.winner?.name,
      attempts: tried.length
    });
    
    return NextResponse.json(finalResult, { status: winner ? 200 : 400 });
    
  } catch (error: any) {
    console.error("[try-dm-graph] error during mutation testing:", {
      error: error?.message || 'Unknown error',
      errorType: error?.constructor?.name || 'unknown',
      hasStack: !!error?.stack
    });
    
    return NextResponse.json({ 
      ok: false, 
      error: error?.message ?? 'Failed to test DM mutations' 
    }, { status: 500 });
  }
}
