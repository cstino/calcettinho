'use client';

import React, { useEffect, useRef, useState } from 'react';
import StatRing from './StatRing';
import { CardFrame, isFrameId, type FrameId } from './frames';
import type { CardTier } from '@/utils/playerRating';
import { RANKED_MIN_MATCHES, tierLabel } from '@/utils/playerRating';
import { getPlayerPhotoUrl } from '@/utils/api';
import './card-tiers.css';

export interface AnimatedCardStats {
  ranked: boolean;
  rkMatches: number;
  ATT: number;
  PAS: number;
  DIF: number;
  POR: number;
  overall: number;
  tier: CardTier;
}

interface AnimatedCardProps {
  name: string;
  email: string;
  stats: AnimatedCardStats;
  frame?: string | null; // award_type del frame attivo (ignorato se sconosciuto)
  photoUrl?: string; // override (default: foto servita da /api/players/{email})
  enableHover?: boolean;
  onClick?: () => void;
  className?: string;
}

// Gradiente degli anelli per tier (design approvato)
const RING_GRADIENTS: Record<CardTier, [string, string]> = {
  unranked: ['#AEBBC4', '#5E6A72'],
  bronzo: ['#F5B570', '#9A5C1E'],
  argento: ['#F2F7FB', '#93A2B0'],
  oro: ['#FFE58E', '#C9931B'],
  platino: ['#E5FFFA', '#57BBD1'],
  champion: ['#E679FF', '#FF2D95'],
};

export default function AnimatedCard({
  name,
  email,
  stats,
  frame,
  photoUrl,
  enableHover = true,
  onClick,
  className = '',
}: AnimatedCardProps) {
  const [ringsIn, setRingsIn] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Anima il riempimento degli anelli quando la card entra nel viewport
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setRingsIn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [from, to] = RING_GRADIENTS[stats.tier];
  const activeFrame: FrameId | null = isFrameId(frame) ? frame : null;
  const photo = photoUrl ?? getPlayerPhotoUrl(email);
  const isUnranked = !stats.ranked;

  const rings = isUnranked
    ? (['ATT', 'PAS', 'DIF', 'POR'] as const).map((lbl) => (
        <StatRing key={lbl} label={lbl} value={null} gradientFrom={from} gradientTo={to} />
      ))
    : (
        [
          ['ATT', stats.ATT],
          ['PAS', stats.PAS],
          ['DIF', stats.DIF],
          ['POR', stats.POR],
        ] as const
      ).map(([lbl, val]) => <StatRing key={lbl} label={lbl} value={val} gradientFrom={from} gradientTo={to} />);

  return (
    <div className={`pcard-wrap ${enableHover ? 'pcard-hoverable' : ''} ${className}`}>
      <div
        ref={cardRef}
        className={`pcard tier-${stats.tier} ${ringsIn ? 'rings-in' : ''} ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      >
        <div className="cbg" />
        <div className="cglow" />
        <div className="cphoto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={name} loading="lazy" />
        </div>
        <div className="csheen" />
        <div className="ctop">
          <div className="covr">
            <b>{isUnranked ? '—' : stats.overall}</b>
            <span>OVR</span>
          </div>
          <span className="cchip">{tierLabel(stats.tier).toUpperCase()}</span>
        </div>
        <div className="cpanel">
          <h3 className="cname">{name}</h3>
          {isUnranked && (
            <div className="cprogress">
              <div className="bar">
                <i style={{ width: `${Math.min(100, (stats.rkMatches / RANKED_MIN_MATCHES) * 100)}%` }} />
              </div>
              <p>
                {stats.rkMatches}/{RANKED_MIN_MATCHES} PARTITE
              </p>
            </div>
          )}
          <div className="cstats">{rings}</div>
        </div>
      </div>
      {activeFrame && <CardFrame frame={activeFrame} />}
    </div>
  );
}
