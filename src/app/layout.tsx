import type { Metadata, Viewport } from "next";
import { Orbitron, DM_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#06080F",
};

export const metadata: Metadata = {
  title: {
    default: "MIDAS - Trading IA | Analyse de marches en temps reel",
    template: "%s | MIDAS",
  },
  description:
    "MIDAS est votre assistant de trading propulse par l'intelligence artificielle. Analyse technique, signaux en temps reel, gestion de portefeuille et strategies automatisees pour trader plus intelligemment.",
  keywords: [
    "trading IA",
    "analyse technique",
    "signaux trading",
    "intelligence artificielle",
    "crypto",
    "bourse",
    "portefeuille",
    "MIDAS",
    "Purama",
    "marches financiers",
    "trading automatise",
  ],
  authors: [{ name: "Purama" }],
  creator: "Purama",
  publisher: "Purama",
  metadataBase: new URL("https://midas.purama.dev"),
  alternates: {
    canonical: "https://midas.purama.dev",
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://midas.purama.dev",
    siteName: "MIDAS",
    title: "MIDAS - Trading IA | Analyse de marches en temps reel",
    description:
      "Assistant de trading IA : analyse technique, signaux en temps reel, gestion de portefeuille et strategies automatisees.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "MIDAS - Trading IA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MIDAS - Trading IA",
    description:
      "Assistant de trading IA : analyse technique, signaux en temps reel et strategies automatisees.",
    images: ["/api/og"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${orbitron.variable} ${dmSans.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            },
          }}
        />
      </body>
    </html>
  );
}
