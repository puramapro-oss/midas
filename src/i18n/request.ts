import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const locales = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ar', 'zh', 'ja', 'ko', 'hi', 'ru', 'tr', 'nl', 'pl', 'sv'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  let locale: Locale = defaultLocale;

  const cookieLocale = cookieStore.get('midas-locale')?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale;
  } else {
    const acceptLang = headerStore.get('accept-language');
    if (acceptLang) {
      const preferred = acceptLang.split(',')[0]?.split('-')[0]?.toLowerCase();
      if (preferred && locales.includes(preferred as Locale)) {
        locale = preferred as Locale;
      }
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
