import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') ?? 'gains';
  const value = searchParams.get('value') ?? '0';
  const label = searchParams.get('label') ?? '';
  const username = searchParams.get('username') ?? 'Trader';
  const ref = searchParams.get('ref') ?? '';

  const titles: Record<string, string> = {
    gains: `+${value} USDT`,
    streak: `${value} jours`,
    palier: `Palier ${value}`,
    achievement: label || 'Achievement',
    classement: `Top ${value}`,
    mission: label || 'Mission complete',
  };

  const subtitles: Record<string, string> = {
    gains: 'de profit ce mois',
    streak: 'de connexion consecutive',
    palier: 'atteint sur MIDAS',
    achievement: 'debloquer sur MIDAS',
    classement: 'du classement MIDAS',
    mission: 'sur MIDAS',
  };

  const title = titles[type] ?? value;
  const subtitle = subtitles[type] ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1920,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #0A0A0F 0%, #1A0A2E 50%, #0A0A0F 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Gold orb top */}
        <div
          style={{
            position: 'absolute',
            top: -200,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        {/* Purple orb bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            left: -50,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 80,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #F59E0B, #7C3AED)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 800,
              color: 'white',
            }}
          >
            M
          </div>
          <span style={{ fontSize: 48, fontWeight: 800, color: '#F59E0B' }}>MIDAS</span>
        </div>

        {/* Main value */}
        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            background: 'linear-gradient(135deg, #F59E0B, #FCD34D)',
            backgroundClip: 'text',
            color: 'transparent',
            lineHeight: 1.1,
            textAlign: 'center',
            padding: '0 60px',
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 36,
            color: 'rgba(255,255,255,0.5)',
            marginTop: 24,
            textAlign: 'center',
          }}
        >
          {subtitle}
        </div>

        {/* Username */}
        <div
          style={{
            fontSize: 28,
            color: 'rgba(255,255,255,0.3)',
            marginTop: 60,
          }}
        >
          @{username}
        </div>

        {/* Glass card stats */}
        <div
          style={{
            marginTop: 80,
            padding: '32px 48px',
            borderRadius: 24,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: 48,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#10B981' }}>IA</span>
            <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }}>Trading</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#F59E0B' }}>24/7</span>
            <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }}>Actif</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: '#7C3AED' }}>Shield</span>
            <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }}>Protege</span>
          </div>
        </div>

        {/* Referral link */}
        {ref && (
          <div
            style={{
              position: 'absolute',
              bottom: 120,
              fontSize: 24,
              color: 'rgba(245,158,11,0.6)',
            }}
          >
            midas.purama.dev/go/{ref}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            fontSize: 20,
            color: 'rgba(255,255,255,0.15)',
          }}
        >
          midas.purama.dev
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}
