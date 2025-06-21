'use client';

import React, { useRef, useCallback, useMemo } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  enableTilt?: boolean;
  className?: string;
  intensity?: number;
}

const ANIMATION_CONFIG = {
  SMOOTH_DURATION: 600,
  INITIAL_DURATION: 1500,
  INITIAL_X_OFFSET: 70,
  INITIAL_Y_OFFSET: 60,
};

const clamp = (value: number, min = 0, max = 100): number =>
  Math.min(Math.max(value, min), max);

const round = (value: number, precision = 3): number =>
  parseFloat(value.toFixed(precision));

const adjust = (
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number
): number =>
  round(toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin));

const easeInOutCubic = (x: number): number =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

export default function TiltCard({ 
  children, 
  enableTilt = true, 
  className = "",
  intensity = 1
}: TiltCardProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const animationHandlers = useMemo(() => {
    if (!enableTilt) return null;

    let rafId: number | null = null;

    const updateCardTransform = (
      offsetX: number,
      offsetY: number,
      card: HTMLElement,
      wrap: HTMLElement
    ) => {
      const width = card.clientWidth;
      const height = card.clientHeight;

      const percentX = clamp((100 / width) * offsetX);
      const percentY = clamp((100 / height) * offsetY);

      const centerX = percentX - 50;
      const centerY = percentY - 50;

      // Applica l'intensità agli effetti
      const rotateX = round(-(centerX / 5) * intensity);
      const rotateY = round((centerY / 4) * intensity);

      // Applica le trasformazioni
      card.style.transform = `
        perspective(1000px) 
        rotateX(${rotateY}deg) 
        rotateY(${rotateX}deg) 
        translateZ(0)
      `;

      // Effetto di ombra dinamica
      const shadowX = (centerX / 10) * intensity;
      const shadowY = (centerY / 10) * intensity;
      const shadowBlur = 20 + Math.abs(centerX + centerY) / 10;
      
      card.style.boxShadow = `
        ${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, 0.3),
        0 0 20px rgba(0, 0, 0, 0.1)
      `;
    };

    const createSmoothAnimation = (
      duration: number,
      startX: number,
      startY: number,
      card: HTMLElement,
      wrap: HTMLElement
    ) => {
      const startTime = performance.now();
      const targetX = wrap.clientWidth / 2;
      const targetY = wrap.clientHeight / 2;

      const animationLoop = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = clamp(elapsed / duration);
        const easedProgress = easeInOutCubic(progress);

        const currentX = adjust(easedProgress, 0, 1, startX, targetX);
        const currentY = adjust(easedProgress, 0, 1, startY, targetY);

        updateCardTransform(currentX, currentY, card, wrap);

        if (progress < 1) {
          rafId = requestAnimationFrame(animationLoop);
        } else {
          // Alla fine dell'animazione, resetta la trasformazione
          card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)';
          card.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.2)';
        }
      };

      rafId = requestAnimationFrame(animationLoop);
    };

    return {
      updateCardTransform,
      createSmoothAnimation,
      cancelAnimation: () => {
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      },
    };
  }, [enableTilt, intensity]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      const card = cardRef.current;
      const wrap = wrapRef.current;

      if (!card || !wrap || !animationHandlers) return;

      const rect = card.getBoundingClientRect();
      animationHandlers.updateCardTransform(
        event.clientX - rect.left,
        event.clientY - rect.top,
        card,
        wrap
      );
    },
    [animationHandlers]
  );

  const handlePointerEnter = useCallback(() => {
    const card = cardRef.current;
    const wrap = wrapRef.current;

    if (!card || !wrap || !animationHandlers) return;

    animationHandlers.cancelAnimation();
    wrap.classList.add("tilt-active");
    card.classList.add("tilt-active");
  }, [animationHandlers]);

  const handlePointerLeave = useCallback(
    (event: React.PointerEvent) => {
      const card = cardRef.current;
      const wrap = wrapRef.current;

      if (!card || !wrap || !animationHandlers) return;

      const rect = card.getBoundingClientRect();
      animationHandlers.createSmoothAnimation(
        ANIMATION_CONFIG.SMOOTH_DURATION,
        event.clientX - rect.left,
        event.clientY - rect.top,
        card,
        wrap
      );
      wrap.classList.remove("tilt-active");
      card.classList.remove("tilt-active");
    },
    [animationHandlers]
  );

  if (!enableTilt) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={wrapRef}
      className={`tilt-wrapper ${className}`.trim()}
      style={{
        perspective: '1000px',
        transformStyle: 'preserve-3d'
      }}
    >
      <div
        ref={cardRef}
        className="tilt-card"
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        style={{
          transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)',
          transition: 'transform 0.1s ease-out, box-shadow 0.1s ease-out',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          transformStyle: 'preserve-3d'
        }}
      >
        {children}
      </div>
    </div>
  );
} 