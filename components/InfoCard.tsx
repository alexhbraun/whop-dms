'use client';
import { useEffect, useState } from 'react';

export default function InfoCard({
  storageKey = 'dms.templates.infoCollapsed',
}: { storageKey?: string }) {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v === 'true' || v === 'false') setCollapsed(v === 'true');
    } catch {}
  }, [storageKey]);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(storageKey, String(next)); } catch {}
      return next;
    });
  }

  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-blue-800">What's a DM Template?</div>
          {!collapsed && (
            <div className="mt-1 text-sm text-blue-700">
              This is the <span className="font-medium">welcome message</span> new members receive
              when they join your community.
              <ul className="mt-2 list-disc ms-5 space-y-1">
                <li><span className="font-medium">Name</span> — for your own organization.</li>
                <li><span className="font-medium">Message content</span> — what the member sees. Use placeholders:
                  <div className="mt-1 space-x-2">
                    <code className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800">{"{{member_name}}"}</code>
                    <code className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800">{"{{community_name}}"}</code>
                    <code className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800">{"{{onboarding_link}}"}</code>
                  </div>
                </li>
                <li><span className="font-medium">Set as default</span> — only one template is active. The default template is sent automatically.</li>
              </ul>
              <p className="mt-2 text-blue-600">
                💡 <span className="font-medium">Tip:</span> Keep it warm and short. End with the onboarding link to collect email and preferences.
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={toggle}
          className="rounded-lg border border-blue-300 bg-blue-100 px-3 py-1 text-xs text-blue-700 hover:bg-blue-200"
          aria-expanded={!collapsed}
        >
          {collapsed ? 'What is this?' : 'Hide explanation'}
        </button>
      </div>
    </div>
  );
}
