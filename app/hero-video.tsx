'use client';

import {useEffect, useState} from 'react';

export default function HeroVideo() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & {connection?: {saveData?: boolean}}).connection;
    const sync = () => setEnabled(!motion.matches && !connection?.saveData);
    sync();
    motion.addEventListener('change', sync);
    return () => motion.removeEventListener('change', sync);
  }, []);
  return <>
    <div className="hero-film callas-film" aria-hidden="true">
      {enabled && <iframe title="Maria Callas — Vissi d’arte, The Ed Sullivan Show, New York, 1956"
        src="https://www.youtube-nocookie.com/embed/ggywso5O9zw?autoplay=1&mute=1&playsinline=1&loop=1&playlist=ggywso5O9zw&rel=0&controls=0&disablekb=1"
        tabIndex={-1} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin" />}
    </div>
  </>;
}
