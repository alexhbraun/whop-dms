export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { toUserIdOrUsername, message } = await req.json();
    if (!toUserIdOrUsername || !message) {
      return new Response(JSON.stringify({ ok: false, error: "Missing toUserIdOrUsername or message" }), { status: 400 });
    }

    const APP_API_KEY =
      (process.env.WHOP_API_KEY ?? process.env.WHOP_APP_API_KEY ?? "").trim();
    if (!APP_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "Missing WHOP_API_KEY" }), { status: 500 });
    }

    // Replace URL with the official Whop REST DM endpoint if your docs specify a different path.
    // The important bit is the header style: Authorization: App <APP_API_KEY>.
    const url = "https://api.whop.com/v1/messages/send-direct-message-to-user";

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // App key style auth
        Authorization: `App ${APP_API_KEY}`,
      },
      body: JSON.stringify({
        toUserIdOrUsername,
        message,
      }),
    });

    const text = await resp.text();
    const json = (() => { try { return JSON.parse(text); } catch { return { raw: text }; } })();

    return new Response(JSON.stringify({
      ok: resp.ok,
      status: resp.status,
      body: json,
    }), { headers: { "Content-Type": "application/json" }, status: resp.ok ? 200 : 500 });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
