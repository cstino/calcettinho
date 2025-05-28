'use client';

import Image from 'next/image';
import { useTheme } from '../hooks/useTheme';
import { useEffect, useState } from 'react';

type LogoType = 'simbolo' | 'scritta' | 'logo-completo';

interface LogoProps {
  type: LogoType;
  width?: number;
  height?: number;
  className?: string;
  alt?: string;
}

export default function Logo({ type, width = 40, height = 40, className = '', alt = 'Calcettinho' }: LogoProps) {
  const { isDark } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evita problemi di hydration aspettando che il componente sia montato
  useEffect(() => {
    setMounted(true);
  }, []);

  // Se non è ancora montato, usa la versione scura come fallback (dato che il tema è sempre dark)
  if (!mounted) {
    return (
      <Image
        src={`/logo/${type}-dark.svg`}
        alt={alt}
        width={width}
        height={height}
        className={className}
        priority={type === 'logo-completo'}
      />
    );
  }

  // Determina il file da usare (sempre dark ora)
  const logoSrc = isDark ? `/logo/${type}-dark.svg` : `/logo/${type}.svg`;

  return (
    <Image
      key={`${type}-${isDark ? 'dark' : 'light'}`} // Forza re-render quando cambia il tema
      src={logoSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={type === 'logo-completo'} // Solo per il logo principale
    />
  );
} 