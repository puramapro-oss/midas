'use client';

import { useState, useCallback } from 'react';
import { Download, Copy, Check } from 'lucide-react';

interface QRGeneratorProps {
  code: string;
}

export default function QRGenerator({ code }: QRGeneratorProps) {
  const [copied, setCopied] = useState(false);
  const qrUrl = `/api/partner/qr/${encodeURIComponent(code)}`;
  const scanUrl = `https://midas.purama.dev/scan/${encodeURIComponent(code)}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(scanUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = scanUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [scanUrl]);

  const handleDownload = useCallback(async () => {
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `midas-qr-${code}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silently fail
    }
  }, [qrUrl, code]);

  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-6">
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4" style={{ fontFamily: 'var(--font-orbitron)' }}>
        Votre QR Code
      </h3>

      {/* QR Code Display */}
      <div className="flex justify-center mb-4">
        <div className="bg-[#0A0A0F] rounded-xl p-4 border border-white/[0.06]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt={`QR Code partenaire ${code}`}
            width={200}
            height={200}
            className="rounded-lg"
          />
        </div>
      </div>

      {/* Scan URL */}
      <div className="bg-white/5 rounded-lg p-3 mb-4">
        <p className="text-xs text-[var(--text-tertiary)] mb-1">Lien de scan</p>
        <p className="text-sm text-[var(--text-primary)] font-mono truncate">
          {scanUrl}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/[0.06] text-sm text-[var(--text-primary)] transition-colors"
          data-testid="qr-copy-btn"
        >
          {copied ? <Check className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copie !' : 'Copier le lien'}
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-black font-medium text-sm hover:opacity-90 transition-opacity"
          data-testid="qr-download-btn"
        >
          <Download className="w-4 h-4" />
          Telecharger
        </button>
      </div>
    </div>
  );
}
