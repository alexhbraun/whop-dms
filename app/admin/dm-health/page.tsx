export const dynamic = "force-dynamic";
import React from "react";
import { headers } from "next/headers";
import DmHealthClient from "./DmHealthClient";

export default async function DmHealthPage() {
  const secret = process.env.ADMIN_DASH_SECRET!;
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  const proto = (h.get("x-forwarded-proto") || "https").split(",")[0];
  const url = `${proto}://${host}/api/admin/dm-health`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "x-admin-secret": secret },
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">DM Health</h1>
        <p className="mt-4 text-red-600">
          Failed to load: {err?.error || res.statusText}
        </p>
      </main>
    );
  }

  const json = await res.json();
  const rows = (json?.data || []) as any[];

  return (
    <main className="p-6 space-y-3">
      <h1 className="text-xl font-semibold">DM Health</h1>
      <p className="text-sm text-gray-600">
        {rows.length} recent sends (filter and export below)
      </p>
      <DmHealthClient rows={rows} />
    </main>
  );
}
