'use client';

import React from 'react';
import './frames.css';

/**
 * Catalogo cornici achievement v3 (design approvato rev 4).
 * Le cornici sono definite in codice, mappate per award_type (special_cards.template_image
 * non è più usato). Ogni famiglia ha un effetto d'identità che cresce col livello.
 */

export type FrameId =
  | '1presenza'
  | 'goleador'
  | 'matador'
  | 'goldenboot'
  | 'assistman'
  | 'regista'
  | 'elfutbol'
  | 'win10'
  | 'win25'
  | 'win50'
  | 'motm';

export type FrameFamily = 'debut' | 'goal' | 'assist' | 'wins' | 'motm';

interface FrameEffects {
  embers?: number;
  flamesBack?: number;
  flamesFront?: number;
  sparks?: number;
  circuit?: 1 | 2 | 3;
  arcs?: number;
  laurel?: { leaves: number; span: number; scale: number };
  stars?: number;
  rays?: boolean;
  dust?: number;
  crown?: boolean;
}

export interface FrameDef extends FrameEffects {
  id: FrameId;
  label: string;
  description: string;
  family: FrameFamily;
  level: 1 | 2 | 3;
  className: string;
}

export const FRAMES: Record<FrameId, FrameDef> = {
  '1presenza': {
    id: '1presenza', label: 'Prima Presenza', description: 'Prima partita giocata',
    family: 'debut', level: 1, className: 'f-presenza',
  },
  goleador: {
    id: 'goleador', label: 'Goleador', description: '10 gol in carriera',
    family: 'goal', level: 1, className: 'f-goleador', embers: 7,
  },
  matador: {
    id: 'matador', label: 'Matador', description: '25 gol in carriera',
    family: 'goal', level: 2, className: 'f-matador', embers: 8, flamesBack: 4, flamesFront: 5,
  },
  goldenboot: {
    id: 'goldenboot', label: 'Golden Boot', description: '50 gol in carriera',
    family: 'goal', level: 3, className: 'f-goldenboot', embers: 12, flamesBack: 6, flamesFront: 7, sparks: 5,
  },
  assistman: {
    id: 'assistman', label: 'Assistman', description: '10 assist in carriera',
    family: 'assist', level: 1, className: 'f-circuit f-assistman', circuit: 1,
  },
  regista: {
    id: 'regista', label: 'Regista', description: '25 assist in carriera',
    family: 'assist', level: 2, className: 'f-circuit f-regista', circuit: 2,
  },
  elfutbol: {
    id: 'elfutbol', label: 'El Fútbol', description: '50 assist in carriera',
    family: 'assist', level: 3, className: 'f-circuit f-elfutbol', circuit: 3, arcs: 4,
  },
  win10: {
    id: 'win10', label: '10 Vittorie', description: '10 vittorie in carriera',
    family: 'wins', level: 1, className: 'f-laurel f-win10', laurel: { leaves: 4, span: 22, scale: 0.85 },
  },
  win25: {
    id: 'win25', label: '25 Vittorie', description: '25 vittorie in carriera',
    family: 'wins', level: 2, className: 'f-laurel f-win25', laurel: { leaves: 7, span: 34, scale: 1 },
  },
  win50: {
    id: 'win50', label: '50 Vittorie', description: '50 vittorie in carriera',
    family: 'wins', level: 3, className: 'f-laurel f-win50', laurel: { leaves: 10, span: 48, scale: 1.08 }, stars: 6,
  },
  motm: {
    id: 'motm', label: 'Man of the Match', description: 'Più votato MVP di una partita',
    family: 'motm', level: 1, className: 'f-motm', rays: true, dust: 8, crown: true,
  },
};

export function isFrameId(value: string | null | undefined): value is FrameId {
  return !!value && value in FRAMES;
}

/* ── effetti generati proceduralmente (valori deterministici da indice) ── */

function Embers({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const left = 6 + i * (86 / Math.max(1, n - 1));
        const d = 2 + ((i * 37) % 15) / 10;
        const dl = ((i * 53) % 22) / 10;
        const dx = (i % 2 ? -1 : 1) * (1.6 + ((i * 7) % 11) * 0.4);
        return (
          <span
            key={i}
            className="em"
            style={{ left: `${left.toFixed(1)}%`, '--d': `${d.toFixed(1)}s`, '--dl': `${dl.toFixed(1)}s`, '--dx': `${dx.toFixed(1)}cqw` } as React.CSSProperties}
          />
        );
      })}
    </>
  );
}

function Flames({ n, back }: { n: number; back: boolean }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const left = -4 + i * (100 / Math.max(1, n - 1)) * 0.96;
        const w = back ? 13.7 + ((i * 13) % 18) * 0.4 : 8 + ((i * 11) % 14) * 0.4;
        const h = back ? 21 + ((i * 17) % 22) * 0.4 : 13.7 + ((i * 13) % 16) * 0.4;
        const d = (back ? 0.8 : 0.6) + ((i * 29) % 10) / 40;
        const dl = ((i * 41) % 12) / 20;
        return (
          <span
            key={i}
            className={back ? 'fl back' : 'fl'}
            style={{ left: `${left.toFixed(1)}%`, width: `${w.toFixed(1)}cqw`, height: `${h.toFixed(1)}cqw`, '--d': `${d.toFixed(2)}s`, '--dl': `${dl.toFixed(2)}s` } as React.CSSProperties}
          />
        );
      })}
    </>
  );
}

function Sparks({ n }: { n: number }) {
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const left = 12 + i * (76 / Math.max(1, n - 1));
        return (
          <span
            key={i}
            className="sp"
            style={{ left: `${left.toFixed(1)}%`, '--d': `${(1.2 + ((i * 31) % 10) / 10).toFixed(1)}s`, '--dl': `${(((i * 47) % 26) / 10).toFixed(1)}s`, '--dx': `${((i % 2 ? -1 : 1) * (2 + ((i * 5) % 9) * 0.4)).toFixed(1)}cqw` } as React.CSSProperties}
          />
        );
      })}
    </>
  );
}

function Circuit({ level, arcs }: { level: 1 | 2 | 3; arcs?: number }) {
  const nodePositions: Array<[string, string]> = [
    ['2.8%', '2%'],
    ['97.2%', '2%'],
    ['2.8%', '98%'],
    ['97.2%', '98%'],
  ];
  const arcPositions: Array<[string, string, string]> = [
    ['1.6%', '17.3%', '2.6s'],
    ['92%', '34.6%', '3.4s'],
    ['1.6%', '69.2%', '3.1s'],
    ['92%', '83.6%', '2.9s'],
  ];
  return (
    <>
      <svg className="circuit" aria-hidden="true">
        {level >= 2 && <rect className="c2" pathLength={56} />}
        <rect className="c1" pathLength={56} />
        {level >= 3 && <rect className="c3" pathLength={56} />}
      </svg>
      {level >= 2 &&
        nodePositions.map(([left, top], i) => (
          <span
            key={i}
            className="nd"
            style={{ left, top, transform: 'translate(-50%, -50%)', '--dl': `${(i * 0.45).toFixed(2)}s` } as React.CSSProperties}
          />
        ))}
      {arcs &&
        arcPositions.slice(0, arcs).map(([left, top, d], i) => (
          <svg key={i} className="arc" viewBox="0 0 16 16" style={{ left, top, '--d': d, '--dl': `${(i * 0.7).toFixed(1)}s` } as React.CSSProperties}>
            <polyline points="2,1 9,6 5,8 14,15" />
          </svg>
        ))}
    </>
  );
}

function Laurel({ cfg }: { cfg: { leaves: number; span: number; scale: number } }) {
  // due rami simmetrici che risalgono gli angoli bassi lungo un arco, foglie tangenti
  const W = 248, H = 347, cx = W / 2, cy = H + 74, r = 128;
  const leaves: React.ReactNode[] = [];
  for (const side of [1, -1]) {
    for (let k = 0; k < cfg.leaves; k++) {
      const step = cfg.span / Math.max(1, cfg.leaves - 1);
      const thetaDeg = side === 1 ? 35 + k * step : 145 - k * step;
      const th = (thetaDeg * Math.PI) / 180;
      const px = cx + r * Math.cos(th);
      const py = cy - r * Math.sin(th);
      const rot = 90 - thetaDeg;
      const s = cfg.scale * (1 - k * 0.05);
      leaves.push(
        <ellipse
          key={`${side}-${k}`}
          cx={px.toFixed(1)}
          cy={py.toFixed(1)}
          rx={(3.8 * s).toFixed(1)}
          ry={(10 * s).toFixed(1)}
          fill="url(#laurel-grad)"
          stroke="rgba(90,60,10,.35)"
          strokeWidth=".5"
          transform={`rotate(${rot.toFixed(0)} ${px.toFixed(1)} ${py.toFixed(1)})`}
          style={{ '--dl': `${(k * 0.3).toFixed(1)}s` } as React.CSSProperties}
        />
      );
    }
  }
  return (
    <svg className="laurel" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="laurel-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F5DE8B" />
          <stop offset="1" stopColor="#C9A22E" />
        </linearGradient>
      </defs>
      {leaves}
    </svg>
  );
}

function Stars({ n }: { n: number }) {
  const positions: Array<[string, string]> = [
    ['6.5%', '86.5%'],
    ['93.5%', '86.5%'],
    ['4%', '70.9%'],
    ['96%', '70.9%'],
    ['8.9%', '95.7%'],
    ['91.1%', '95.7%'],
  ];
  return (
    <>
      {positions.slice(0, n).map(([left, top], i) => (
        <span
          key={i}
          className="st"
          style={{ left, top, '--d': `${(2.6 + ((i * 37) % 14) / 10).toFixed(1)}s`, '--dl': `${(i * 0.55).toFixed(2)}s` } as React.CSSProperties}
        />
      ))}
    </>
  );
}

function Rays({ dust }: { dust: number }) {
  return (
    <>
      <div className="rays" />
      {Array.from({ length: dust }, (_, i) => {
        const left = 18 + i * (64 / Math.max(1, dust - 1));
        return (
          <span
            key={i}
            className="du"
            style={{ left: `${left.toFixed(1)}%`, '--d': `${(2.4 + ((i * 33) % 16) / 10).toFixed(1)}s`, '--dl': `${(((i * 59) % 30) / 10).toFixed(1)}s` } as React.CSSProperties}
          />
        );
      })}
    </>
  );
}

function Crown() {
  return (
    <svg className="cframe-crown" viewBox="0 0 34 22" aria-hidden="true">
      <defs>
        <linearGradient id="crown-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF3B0" />
          <stop offset="1" stopColor="#D4A017" />
        </linearGradient>
      </defs>
      <path d="M3 19 L5 7.5 L11.5 12.5 L17 3 L22.5 12.5 L29 7.5 L31 19 Z" fill="url(#crown-grad)" stroke="#96700A" strokeWidth=".8" />
    </svg>
  );
}

export function CardFrame({ frame }: { frame: FrameId }) {
  const def = FRAMES[frame];
  if (!def) return null;

  return (
    <>
      <div className={`cframe ${def.className}`}>
        <div className="fx">
          {def.flamesBack ? <Flames n={def.flamesBack} back /> : null}
          {def.flamesFront ? <Flames n={def.flamesFront} back={false} /> : null}
          {def.embers ? <Embers n={def.embers} /> : null}
          {def.sparks ? <Sparks n={def.sparks} /> : null}
          {def.circuit ? <Circuit level={def.circuit} arcs={def.arcs} /> : null}
          {def.laurel ? <Laurel cfg={def.laurel} /> : null}
          {def.stars ? <Stars n={def.stars} /> : null}
          {def.rays ? <Rays dust={def.dust || 6} /> : null}
        </div>
        <div className="edge" />
        <div className="edge2" />
        <div className="glow" />
      </div>
      {def.crown ? <Crown /> : null}
    </>
  );
}
