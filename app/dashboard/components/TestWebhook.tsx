"use client";
import { useState } from "react";

export default function TestWebhook({ businessId, username }: { businessId: string; username: string; }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="mt-4">
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true); setMsg(null);
          const res = await fetch("/api/admin/test-webhook", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_DASH_SECRET!,
            } as any,
            body: JSON.stringify({ businessId, username }),
          });
          const j = await res.json();
          setMsg(j.ok ? "✅ Test event sent." : `❌ ${j.error || "Failed"}`);
          setBusy(false);
        }}
        className="px-3 py-2 rounded-md bg-[linear-gradient(90deg,#FF8232_0%,#DC2828_100%)] text-white shadow"
      >
        {busy ? "Sending…" : "Send test webhook"}
      </button>
      {msg && <p className="text-sm mt-2">{msg}</p>}
    </div>
  );
}
