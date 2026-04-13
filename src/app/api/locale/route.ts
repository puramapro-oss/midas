import { NextRequest, NextResponse } from 'next/server';

const VALID_LOCALES = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ar', 'zh', 'ja', 'ko', 'hi', 'ru', 'tr', 'nl', 'pl', 'sv'];

export async function POST(request: NextRequest) {
  try {
    const { locale } = await request.json();
    if (!VALID_LOCALES.includes(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    const response = NextResponse.json({ success: true, locale });
    response.cookies.set('midas-locale', locale, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
