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
    <div className="rounded-2xl border border-white/10 bg-white/10 dark:bg-white/5 backdrop-blur-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">What’s a DM Template?</div>
          {!collapsed && (
            <div className="mt-1 text-sm text-white/80 dark:text-white/70">
              This is the <span className="font-medium">welcome message</span> new members receive
              when they join your community.
              <ul className="mt-2 list-disc ms-5 space-y-1">
                <li><span className="font-medium">Name</span> — for your own organization.</li>
                <li><span className="font-medium">Message content</span> — what the member sees. Use placeholders:
                  <div className="mt-1 space-x-2">
                    <code className="rounded bg-white/10 px-1.5 py-0.5">{"{{member_name}}"}</code>
                    <code className="rounded bg-white/10 px-1.5 py-0.5">{"{{community_name}}"}</code>
                    <code className="rounded bg-white/10 px-1.5 py-0.5">{"{{onboarding_link}}"}</code>
                  </div>
                </li>
                <li><span className="font-medium">Set as default</span> — only one template is active. The default template is sent automatically.</li>
              </ul>
              <p className="mt-2 text-white/70">
                💡 <span className="font-medium">Tip:</span> Keep it warm and short. End with the onboarding link to collect email and preferences.
              </p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={toggle}
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/90 hover:bg-white/15"
          aria-expanded={!collapsed}
        >
          {collapsed ? 'What is this?' : 'Hide explanation'}
        </button>
      </div>
    </div>
  );
}
