'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLocale } from 'next-intl';
import { cn } from '@/lib/utils/formatters';

const LANGUAGES = [
  { code: 'fr', flag: '\u{1F1EB}\u{1F1F7}', name: 'Francais' },
  { code: 'en', flag: '\u{1F1EC}\u{1F1E7}', name: 'English' },
  { code: 'es', flag: '\u{1F1EA}\u{1F1F8}', name: 'Espanol' },
  { code: 'de', flag: '\u{1F1E9}\u{1F1EA}', name: 'Deutsch' },
  { code: 'it', flag: '\u{1F1EE}\u{1F1F9}', name: 'Italiano' },
  { code: 'pt', flag: '\u{1F1E7}\u{1F1F7}', name: 'Portugues' },
  { code: 'ar', flag: '\u{1F1F8}\u{1F1E6}', name: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
  { code: 'zh', flag: '\u{1F1E8}\u{1F1F3}', name: '\u4E2D\u6587' },
  { code: 'ja', flag: '\u{1F1EF}\u{1F1F5}', name: '\u65E5\u672C\u8A9E' },
  { code: 'ko', flag: '\u{1F1F0}\u{1F1F7}', name: '\uD55C\uAD6D\uC5B4' },
  { code: 'hi', flag: '\u{1F1EE}\u{1F1F3}', name: '\u0939\u093F\u0928\u094D\u0926\u0940' },
  { code: 'ru', flag: '\u{1F1F7}\u{1F1FA}', name: '\u0420\u0443\u0441\u0441\u043A\u0438\u0439' },
  { code: 'tr', flag: '\u{1F1F9}\u{1F1F7}', name: 'Turkce' },
  { code: 'nl', flag: '\u{1F1F3}\u{1F1F1}', name: 'Nederlands' },
  { code: 'pl', flag: '\u{1F1F5}\u{1F1F1}', name: 'Polski' },
  { code: 'sv', flag: '\u{1F1F8}\u{1F1EA}', name: 'Svenska' },
] as const;

export default function LanguageSelector() {
  const currentLocale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === currentLocale) ?? LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSelect(locale: string) {
    if (locale === currentLocale) {
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      await fetch('/api/locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });
      window.location.reload();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div ref={dropdownRef} className="relative" data-testid="language-selector">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={cn(
          'flex items-center gap-2.5 w-full px-4 py-3 rounded-xl border transition-all duration-200',
          'border-white/[0.08] bg-white/[0.03] text-sm text-white',
          'hover:border-white/[0.12] focus:border-[#FFD700]/50 focus:shadow-[0_0_12px_rgba(255,215,0,0.15)]',
          loading && 'opacity-50 cursor-wait'
        )}
        data-testid="language-selector-trigger"
      >
        <Globe className="h-4 w-4 text-white/40" />
        <span className="text-base">{currentLang.flag}</span>
        <span className="flex-1 text-left">{currentLang.name}</span>
        <ChevronDown className={cn('h-4 w-4 text-white/40 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-full max-h-64 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#0A0A0F] backdrop-blur-xl shadow-xl">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleSelect(lang.code)}
              className={cn(
                'flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors',
                'hover:bg-white/[0.06]',
                lang.code === currentLocale
                  ? 'text-[#FFD700] bg-[#FFD700]/[0.06]'
                  : 'text-white/70'
              )}
              data-testid={`language-option-${lang.code}`}
            >
              <span className="text-base">{lang.flag}</span>
              <span className="flex-1 text-left">{lang.name}</span>
              {lang.code === currentLocale && <Check className="h-4 w-4 text-[#FFD700]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
