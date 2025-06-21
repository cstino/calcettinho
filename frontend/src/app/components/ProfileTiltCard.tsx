'use client';

import React from 'react';
import TiltCard from './TiltCard';
import './TiltCard.css';

interface ProfileTiltCardProps {
  src: string;
  alt: string;
  className?: string;
  enableTilt?: boolean;
  intensity?: number;
  onClick?: () => void;
}

export default function ProfileTiltCard({ 
  src, 
  alt, 
  className = "", 
  enableTilt = true,
  intensity = 0.8,
  onClick
}: ProfileTiltCardProps) {
  return (
    <TiltCard 
      enableTilt={enableTilt}
      intensity={intensity}
      className={className}
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-auto cursor-pointer transition-all duration-300 hover:brightness-110"
        onClick={onClick}
        style={{
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
        }}
      />
    </TiltCard>
  );
} 