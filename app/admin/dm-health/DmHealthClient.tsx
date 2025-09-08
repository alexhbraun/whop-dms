"use client";

import React from "react";

type Row = {
  event_id: string;
  to_user: string | null;
  status: "sent" | "failed" | "deferred" | string;
  error: string | null;
  message_preview?: string | null;
  created_at: string; // ISO
};

type Props = {
  rows: Row[];
};

function toCSV(rows: Row[]) {
  const headers = [
    "created_at",
    "event_id",
    "to_user",
    "status",
    "message_preview",
    "error",
  ];
  const esc = (v: any) =>
    `"${String(v ?? "").replaceAll(`"`, `""`).replaceAll(/\r?\n/g, " ")}"`;

  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.created_at,
        r.event_id,
        r.to_user ?? "",
        r.status,
        r.message_preview ?? "",
        r.error ?? "",
      ]
        .map(esc)
        .join(","),
    ),
  ];
  return lines.join("\n");
}

const PAGE_SIZE = 50;

export default function DmHealthClient({ rows }: Props) {
  const [status, setStatus] = React.useState<string>("all");
  const [q, setQ] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(0);

  const filtered = React.useMemo(() => {
    const s = status.toLowerCase();
    const query = q.trim().toLowerCase();

    let r = rows;
    if (s !== "all") {
      r = r.filter((x) => (x.status || "").toLowerCase() === s);
    }
    if (query) {
      r = r.filter((x) => {
        const hay =
          `${x.event_id} ${x.to_user ?? ""} ${x.status} ${x.message_preview ?? ""} ${x.error ?? ""}`.toLowerCase();
        return hay.includes(query);
      });
    }
    return r;
  }, [rows, status, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(
    clampedPage * PAGE_SIZE,
    clampedPage * PAGE_SIZE + PAGE_SIZE,
  );

  const onExport = () => {
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `dm-health-${ts}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  React.useEffect(() => {
    // Reset to first page when filters change
    setPage(0);
  }, [status, q]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-700">
          Status:&nbsp;
          <select
            className="border rounded px-2 py-1"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All</option>
            <option value="sent">sent</option>
            <option value="failed">failed</option>
            <option value="deferred">deferred</option>
          </select>
        </label>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search (event, user, text, error)"
          className="border rounded px-3 py-1 min-w-[280px] flex-1"
        />

        <button
          onClick={onExport}
          className="border rounded px-3 py-1 hover:bg-gray-50"
          title="Download filtered rows as CSV"
        >
          Export CSV
        </button>

        <div className="ml-auto text-sm text-gray-500">
          Showing {pageRows.length} of {filtered.length} (total {rows.length})
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
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
            {pageRows.map((r) => (
              <tr key={`${r.event_id}-${r.created_at}`} className="border-t">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-2 font-mono">{r.event_id}</td>
                <td className="px-3 py-2">{r.to_user}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      "rounded px-2 py-0.5 " +
                      (r.status === "sent"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : r.status === "failed"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-yellow-50 text-yellow-700 border border-yellow-200")
                    }
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2">{r.message_preview || ""}</td>
                <td className="px-3 py-2 text-red-600">{r.error || ""}</td>
              </tr>
            ))}

            {pageRows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-500" colSpan={6}>
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={clampedPage <= 0}
          className="border rounded px-2 py-1 disabled:opacity-50"
        >
          ← Prev
        </button>
        <div className="text-sm">
          Page {clampedPage + 1} / {totalPages}
        </div>
        <button
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={clampedPage >= totalPages - 1}
          className="border rounded px-2 py-1 disabled:opacity-50"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
