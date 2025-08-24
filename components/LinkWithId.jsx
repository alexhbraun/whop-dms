'use client';
export default function LinkWithId({ baseHref, creatorId, children, className = '' }) {
  const href = creatorId ? `${baseHref}${baseHref.includes('?') ? '&' : '?'}community_id=${encodeURIComponent(creatorId)}` : baseHref;
  return <a href={href} className={className}>{children}</a>;
}
