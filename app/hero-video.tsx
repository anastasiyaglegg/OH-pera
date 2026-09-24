'use client';

import {useEffect, useRef, useState} from 'react';

export default function HeroVideo() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const playerRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = (navigator as Navigator & {connection?: {saveData?: boolean}}).connection;
    const sync = () => setEnabled(!motion.matches && !connection?.saveData);
    sync();
    motion.addEventListener('change', sync);
    return () => motion.removeEventListener('change', sync);
  }, []);

  const sendPlayerCommand = (func: string, args: unknown[] = []) => {
    playerRef.current?.contentWindow?.postMessage(JSON.stringify({
      event: 'command',
      func,
      args,
    }), 'https://www.youtube-nocookie.com');
  };

  const toggleSound = () => {
    if (muted) {
      sendPlayerCommand('unMute');
      sendPlayerCommand('setVolume', [70]);
      sendPlayerCommand('playVideo');
    } else {
      sendPlayerCommand('mute');
    }
    setMuted((current) => !current);
  };

  return <>
    <div className="hero-film callas-film" aria-hidden="true">
      {enabled && <iframe ref={playerRef} title="Maria Callas — Vissi d’arte, The Ed Sullivan Show, New York, 1956"
        src="https://www.youtube-nocookie.com/embed/ggywso5O9zw?autoplay=1&mute=1&playsinline=1&loop=1&playlist=ggywso5O9zw&rel=0&controls=0&disablekb=1&enablejsapi=1"
        onLoad={() => setReady(true)}
        tabIndex={-1} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin" />}
    </div>
    {enabled && <div className="hero-film-tools">
      <button
        type="button"
        className="hero-film-toggle"
        onClick={toggleSound}
        disabled={!ready}
        aria-pressed={!muted}
        aria-label={muted ? 'Turn on sound for the Maria Callas video' : 'Mute the Maria Callas video'}
      >
        {muted ? 'Sound on' : 'Sound off'}
      </button>
    </div>}
  </>;
}
