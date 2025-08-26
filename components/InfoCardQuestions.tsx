'use client';
import { useEffect, useState } from 'react';

export default function InfoCardQuestions({
  storageKey = 'dms.questions.infoCollapsed',
}: { storageKey?: string }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v === 'true' || v === 'false') setCollapsed(v === 'true');
    } catch {}
  }, [storageKey]);

  function toggle() {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(storageKey, String(next)); } catch {}
      return next;
    });
  }

  return (
    <div className="rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-green-800">What are Onboarding Questions?</div>
          {!collapsed && (
            <div className="mt-1 text-sm text-green-700 space-y-3">
              <p>
                These are the short questions your new member answers after tapping the welcome message's link.
                Their answers appear in <span className="font-medium">Leads</span> and can be forwarded to your CRM.
              </p>

              <div>
                <div className="font-medium">Common uses</div>
                <ul className="list-disc ms-5 space-y-1">
                  <li>Collect an email address</li>
                  <li>Ask about goals or experience level</li>
                  <li>Let members pick interests so you can segment them</li>
                </ul>
              </div>

              <div>
                <div className="font-medium">Question types</div>
                <ul className="list-disc ms-5 space-y-1">
                  <li><span className="font-medium">Short text</span> — single‑line answer.</li>
                  <li><span className="font-medium">Long text</span> — multi‑line answer.</li>
                  <li><span className="font-medium">Email</span> — validates email format.</li>
                  <li><span className="font-medium">Single select</span> — pick one option.</li>
                  <li><span className="font-medium">Multi select</span> — pick many options.</li>
                  <li><span className="font-medium">Number</span> — numeric input only.</li>
                </ul>
              </div>

              <div>
                <div className="font-medium">How it works</div>
                <ul className="list-disc ms-5 space-y-1">
                  <li><span className="font-medium">Drag</span> to reorder questions.</li>
                  <li>Toggle <span className="font-medium">Required</span> to make an answer mandatory.</li>
                  <li>For select questions, add/edit <span className="font-medium">Options</span>.</li>
                </ul>
              </div>

              <div className="text-green-600">
                💡 <span className="font-medium">Tips:</span> Keep it to 1–4 questions, make email required if you need it, and align options with how you tag/segment members.
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={toggle}
          className="rounded-lg border border-green-300 bg-green-100 px-3 py-1 text-xs text-green-700 hover:bg-green-200"
          aria-expanded={!collapsed}
        >
          {collapsed ? 'What is this?' : 'Hide explanation'}
        </button>
      </div>
    </div>
  );
}
