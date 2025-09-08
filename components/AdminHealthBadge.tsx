"use client";
import useSWR from "swr";

export default function AdminHealthBadge() {
  const secret = process.env.NEXT_PUBLIC_SHOW_HEALTH === "true";
  const { data } = useSWR(secret ? "/api/admin/dm-health" : null, (url) =>
    fetch(url, { 
      headers: { 
        "x-admin-secret": process.env.NEXT_PUBLIC_ADMIN_DASH_SECRET ?? "" 
      } 
    }).then(r => r.ok ? r.json() : null)
  );
  
  if (!secret || !data) return null;
  
  const ok = !!data.ok;
  return (
    <div className="fixed right-4 top-4 badge-amber shadow-glass z-50">
      <span className={`h-2 w-2 rounded-full ${ok ? "bg-green-600" : "bg-red-600"}`} />
      {ok ? "DMs Healthy" : "DMs Issue"}
    </div>
  );
}
