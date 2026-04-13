'use client';

import { useEffect, useMemo, useState } from 'react';
import Particles from '@tsparticles/react';
import { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions } from '@tsparticles/engine';

type Variant = 'landing' | 'dashboard';

interface ParticleBackgroundProps {
  variant?: Variant;
  id?: string;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setMobile(window.innerWidth < 768);
  }, []);
  return mobile;
}

function buildOptions(mobile: boolean, variant: Variant): ISourceOptions {
  const isLanding = variant === 'landing';

  // Landing: richer, more particles, constellation links
  // Dashboard: subtle ambient glow, fewer particles, no links
  const count = isLanding
    ? (mobile ? 18 : 35)
    : (mobile ? 8 : 20);

  return {
    fullScreen: false,
    fpsLimit: 30,
    particles: {
      number: {
        value: count,
        density: { enable: true, width: 1920, height: 1080 },
      },
      color: { value: isLanding ? '#FFD700' : ['#FFD700', '#FFC107', '#B8860B'] },
      opacity: {
        value: isLanding
          ? { min: 0.06, max: 0.22 }
          : { min: 0.03, max: 0.12 },
        animation: {
          enable: true,
          speed: isLanding ? 0.4 : 0.2,
          sync: false,
        },
      },
      size: {
        value: isLanding
          ? { min: 1, max: 2.5 }
          : { min: 0.8, max: 1.8 },
        animation: {
          enable: isLanding,
          speed: 0.5,
          sync: false,
        },
      },
      links: {
        enable: isLanding && !mobile,
        color: '#FFD700',
        distance: 150,
        opacity: 0.05,
        width: 1,
      },
      move: {
        enable: true,
        speed: isLanding ? 0.35 : 0.15,
        direction: 'none',
        outModes: { default: 'out' },
        straight: false,
      },
    },
    interactivity: {
      events: {
        onHover: {
          enable: !mobile,
          mode: isLanding ? 'grab' : 'bubble',
        },
      },
      modes: {
        grab: {
          distance: 160,
          links: { opacity: 0.12, color: '#FFD700' },
        },
        bubble: {
          distance: 200,
          size: 3,
          duration: 2,
          opacity: 0.2,
        },
      },
    },
    detectRetina: true,
  };
}

// Singleton: engine only needs to init once across all instances
let engineInitPromise: Promise<void> | null = null;

export default function ParticleBackground({ variant = 'landing', id }: ParticleBackgroundProps) {
  const [engineReady, setEngineReady] = useState(false);
  const mobile = useIsMobile();
  const options = useMemo(() => buildOptions(mobile, variant), [mobile, variant]);
  const particlesId = id ?? `midas-particles-${variant}`;

  useEffect(() => {
    if (!engineInitPromise) {
      engineInitPromise = initParticlesEngine(async (engine) => {
        await loadSlim(engine);
      });
    }
    engineInitPromise.then(() => setEngineReady(true));
  }, []);

  if (!engineReady) return null;

  return (
    <Particles
      id={particlesId}
      className="absolute inset-0 z-0"
      options={options}
    />
  );
}
