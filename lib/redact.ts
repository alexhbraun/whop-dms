// lib/redact.ts
export function redact(value?: string | null, showTail = 4) {
  if (!value) return '⟂ missing';
  const v = String(value);
  if (v.length <= showTail) return '••••';
  return '••••' + v.slice(-showTail);
}


