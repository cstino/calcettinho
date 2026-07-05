'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import './RatingPicker.css';

interface RatingPickerProps {
  value: number | null;
  onChange: (value: number) => void;
  accentColor: string; // colore del valore attivo (per tipo di voto)
}

/**
 * Carosello numerico orizzontale 1-10 (design approvato): si trascina o si tocca,
 * il valore scelto si ingrandisce al centro. Scroll-snap nativo + rilevamento
 * dell'elemento più vicino al centro.
 */
export default function RatingPicker({ value, onChange, accentColor }: RatingPickerProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<number | null>(value);
  const rafRef = useRef<number | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  valueRef.current = value;

  const getPicks = useCallback((): HTMLElement[] => {
    const track = trackRef.current;
    return track ? Array.from(track.querySelectorAll<HTMLElement>('.rp-pick')) : [];
  }, []);

  const findCentered = useCallback((): { el: HTMLElement; n: number } | null => {
    const track = trackRef.current;
    if (!track) return null;
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best: HTMLElement | null = null;
    let bestDist = Infinity;
    for (const p of getPicks()) {
      const c = p.offsetLeft + p.offsetWidth / 2;
      const d = Math.abs(c - mid);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    return best ? { el: best, n: Number(best.dataset.n) } : null;
  }, [getPicks]);

  const highlightCentered = useCallback(() => {
    const centered = findCentered();
    if (!centered) return;
    for (const p of getPicks()) p.classList.toggle('rp-active', p === centered.el);
  }, [findCentered, getPicks]);

  const scrollToValue = useCallback((n: number, smooth: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    const pick = getPicks().find((p) => Number(p.dataset.n) === n);
    if (!pick) return;
    const left = pick.offsetLeft + pick.offsetWidth / 2 - track.clientWidth / 2;
    if (smooth) track.scrollTo({ left, behavior: 'smooth' });
    else track.scrollLeft = left;
  }, [getPicks]);

  // Posizione iniziale (senza animazione): valore corrente o centro strip (5/6)
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollToValue(valueRef.current ?? 5, false);
      highlightCentered();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Se il valore cambia dall'esterno (es. reset), riallinea
  useEffect(() => {
    if (value != null) {
      scrollToValue(value, true);
    }
  }, [value, scrollToValue]);

  const handleScroll = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(highlightCentered);

    // "Settle": quando lo scroll si ferma, il numero centrato diventa il voto
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => {
      const centered = findCentered();
      if (centered && centered.n !== valueRef.current) {
        onChange(centered.n);
      }
    }, 140);
  };

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
  }, []);

  return (
    <div className="rp" style={{ '--rp-accent': accentColor } as React.CSSProperties}>
      <div className="rp-track" ref={trackRef} onScroll={handleScroll}>
        <div className="rp-pad" />
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            data-n={n}
            className="rp-pick"
            aria-label={`Voto ${n}`}
            onClick={() => { onChange(n); scrollToValue(n, true); }}
          >
            {n}
          </button>
        ))}
        <div className="rp-pad" />
      </div>
    </div>
  );
}
