import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { setRequestLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import "@/app/globals.css";
import Navbar from "@/components/ui/Navbar";
import BottomNav from "@/components/ui/BottomNav";
import OfflineIndicator from "@/components/ui/OfflineIndicator";
import InstallPrompt from "@/components/ui/InstallPrompt";

import ErrorBoundary from "@/components/ui/ErrorBoundary";
import WeatherAlertBanner from "@/components/ui/WeatherAlertBanner";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { VoiceProvider } from "@/lib/VoiceContext";
import { FloatingPaths } from "@/components/ui/BackgroundPaths";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

const LOCALES = ["en", "hi", "bn"];

export const viewport = {
  themeColor: "#FF5A36",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params: { locale } }) {
  const meta = {
    en: {
      title: "EVACORE - Shelter Live Capacity & Voucher System",
      description: "Disaster shelter capacity tracking and emergency relief voucher system.",
    },
    hi: {
      title: "राहत ट्रैकर - आश्रय क्षमता और वाउचर प्रणाली",
      description: "आपदा आश्रय क्षमता ट्रैकिंग और आपातकालीन राहत वाउचर प्रणाली।",
    },
    bn: {
      title: "ত্রাণ ট্র্যাকার - আশ্রয় ধারণক্ষমতা ও ভাউচার ব্যবস্থা",
      description: "দুর্যোগ আশ্রয় ধারণক্ষমতা ট্র্যাকিং এবং জরুরি ত্রাণ ভাউচার ব্যবস্থা।",
    },
  };
  const current = meta[locale] || meta.en;

  return {
    title: current.title,
    description: current.description,
    manifest: "/manifest.json",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "EVACORE",
    },
    icons: {
      icon: "/icons/icon-192x192.png",
      apple: "/apple-touch-icon.png",
      shortcut: "/icons/icon-192x192.png",
    },
  };
}



export default async function RootLayout({ children, params: { locale } }) {
  if (!LOCALES.includes(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
        <meta name="app-version" content="v9-20260914" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                // Aggressively unregister all old SWs and re-register fresh
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  var unregPromises = regs.map(function(r) { return r.unregister(); });
                  return Promise.all(unregPromises);
                }).then(function() {
                  // Clear all caches
                  if ('caches' in window) {
                    caches.keys().then(function(keys) {
                      keys.forEach(function(k) { caches.delete(k); });
                    });
                  }
                  // Re-register fresh SW
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${spaceGrotesk.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
        <NextIntlClientProvider messages={messages}>
          <LanguageProvider initialLocale={locale}>
            <AuthProvider>
              <VoiceProvider>
                <ErrorBoundary>


                  {/* Responsive Modern App Shell */}
                  <div className="app-shell relative overflow-hidden bg-white">
                    {/* Ambient KokonutUI Floating Vine Paths Background */}
                    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                      <FloatingPaths position={1} />
                    </div>

                    <div className="relative z-10 flex flex-col flex-1 min-h-0 w-full">
                      <WeatherAlertBanner />
                      <OfflineIndicator />
                      <Navbar />
                      <InstallPrompt />
                      
                      {/* Main Page Area */}
                      <main className="flex-1 px-3 sm:px-6 py-4 pb-28 overflow-x-hidden w-full animate-smooth-enter">
                        {children}
                      </main>

                      {/* Fixed Navigation */}
                      <BottomNav />
                    </div>
                  </div>
                </ErrorBoundary>
              </VoiceProvider>
            </AuthProvider>
          </LanguageProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}