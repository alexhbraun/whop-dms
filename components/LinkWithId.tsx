'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

interface LinkWithIdProps {
  baseHref: string;
  creatorId: string | null;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  onClick?: () => void;
}

export default function LinkWithId({
  baseHref,
  creatorId,
  children,
  className = '',
  ariaLabel,
  onClick,
}: LinkWithIdProps) {
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();

  console.log('[LinkWithId] Rendering. baseHref:', baseHref, 'creatorId:', creatorId, 'currentSearchParams:', currentSearchParams?.toString());

  const getHref = () => {
    // Safely create URLSearchParams, providing an empty string if currentSearchParams is null
    const params = new URLSearchParams(currentSearchParams?.toString() || '');

    if (creatorId) {
      params.set('community_id', creatorId);
    } else {
      // If creatorId is null, explicitly remove it from params
      params.delete('community_id');
    }

    const queryString = params.toString();
    return `${baseHref}${queryString ? `?${queryString}` : ''}`;
  };

  const href = getHref();

  // When creatorId is missing, disable the link visually and functionally
  const isDisabled = !creatorId;

  return (
    <Link
      href={href}
      className={`${className} ${isDisabled ? 'pointer-events-none opacity-50 cursor-not-allowed' : ''}`}
      aria-label={ariaLabel || (typeof children === 'string' ? children : '')}
      aria-disabled={isDisabled}
      onClick={isDisabled ? (e) => e.preventDefault() : onClick}
      tabIndex={isDisabled ? -1 : 0}
    >
      {children}
    </Link>
  );
}
