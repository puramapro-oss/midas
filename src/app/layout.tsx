import type { Metadata, Viewport } from "next";
import { Orbitron, DM_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import CookieBanner from "@/components/shared/CookieBanner";
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

const educationalTitle = "MIDAS — Information et simulation éducative";
const educationalDescription =
  "Informations générales et simulations éducatives pour comprendre les marchés financiers, sans ordre réel ni connexion à un exchange.";
const educationalImage = `/api/og?${new URLSearchParams({
  title: "Information et simulation éducative",
  description:
    "Comprendre les marchés financiers, sans ordre réel ni connexion à un exchange.",
})}`;

export const metadata: Metadata = {
  title: {
    default: educationalTitle,
    template: "%s | MIDAS",
  },
  description: educationalDescription,
  keywords: [
    "éducation financière",
    "information générale",
    "simulation éducative",
    "crypto",
    "MIDAS",
    "Purama",
    "marchés financiers",
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
    title: educationalTitle,
    description: educationalDescription,
    images: [
      {
        url: educationalImage,
        width: 1200,
        height: 630,
        alt: educationalTitle,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: educationalTitle,
    description: educationalDescription,
    images: [educationalImage],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={`${orbitron.variable} ${dmSans.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('midas-theme');if(t==='oled'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
        <CookieBanner />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`,
          }}
        />
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
