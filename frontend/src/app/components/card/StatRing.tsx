'use client';

import React, { useId } from 'react';

interface StatRingProps {
  label: string;
  value: number | null; // null = unranked (anello vuoto con "?")
  gradientFrom: string;
  gradientTo: string;
}

// Anello circolare di una statistica (max 99), valore al centro, etichetta sotto.
// Il riempimento è animato via CSS quando la card ha la classe "rings-in".
export default function StatRing({ label, value, gradientFrom, gradientTo }: StatRingProps) {
  const gradId = useId();
  const pct = value != null ? Math.round((value / 99) * 100) : 0;

  return (
    <div className="ring" style={{ '--v': pct } as React.CSSProperties}>
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={gradientFrom} />
            <stop offset="1" stopColor={gradientTo} />
          </linearGradient>
        </defs>
        <circle className="track" cx="24" cy="24" r="20" pathLength={100} />
        {value != null && <circle className="fill" cx="24" cy="24" r="20" pathLength={100} stroke={`url(#${gradId})`} />}
      </svg>
      {value != null ? <span className="ring-val">{value}</span> : <span className="unranked-q">?</span>}
      <span className="ring-lbl">{label}</span>
    </div>
  );
}
