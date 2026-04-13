import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code || code.length > 100) {
      return NextResponse.json({ error: 'Code invalide' }, { status: 400 });
    }

    const scanUrl = `https://midas.purama.dev/scan/${encodeURIComponent(code)}`;

    const qrBuffer = await QRCode.toBuffer(scanUrl, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#F59E0B',
        light: '#0A0A0F',
      },
    });

    return new NextResponse(new Uint8Array(qrBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Content-Disposition': `inline; filename="midas-qr-${code}.png"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur generation QR';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
