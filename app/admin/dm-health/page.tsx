export const dynamic = "force-dynamic"; // always SSR
import React from "react";

export default async function DmHealthPage() {
  const secret = process.env.ADMIN_DASH_SECRET!;
  const base = process.env.NEXT_PUBLIC_BASE_URL || ""; // set this in Vercel if needed
  const url = `${base || ""}/api/admin/dm-health`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "x-admin-secret": secret },
    // ensure it never hits the client
    cache: "no-store",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return (
      <main className="p-6">
        <h1 className="text-xl font-semibold">DM Health</h1>
        <p className="mt-4 text-red-600">Failed to load: {err?.error || res.statusText}</p>
      </main>
    );
  }

  const json = await res.json();
  const rows: any[] = json.data || [];

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">DM Health</h1>
      <p className="text-sm text-gray-600 mt-1">{rows.length} recent sends</p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[900px] text-sm border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Created</th>
              <th className="px-3 py-2 text-left">Event</th>
              <th className="px-3 py-2 text-left">To</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Preview</th>
              <th className="px-3 py-2 text-left">Error</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.event_id}-${r.created_at}`} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-3 py-2 font-mono">{r.event_id}</td>
                <td className="px-3 py-2">{r.to_user}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">{r.message_preview || ""}</td>
                <td className="px-3 py-2 text-red-600">{r.error || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
