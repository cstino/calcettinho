import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from './contexts/NotificationContext';
import EvolutionToast from './components/EvolutionToast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#00a273' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ],
}

export const metadata: Metadata = {
  title: "Calcettinho ⚽",
  description: "App professionale per gestire partite di calcetto con carte giocatori personalizzate, statistiche avanzate e sistema di votazioni",
  manifest: "/manifest.json",
  keywords: ["calcetto", "5vs5", "partite", "statistiche", "carte giocatori", "votazioni", "sport"],
  authors: [{ name: "Calcettinho Team" }],
  creator: "Calcettinho",
  publisher: "Calcettinho",
  category: "Sports",
  
  // PWA Configuration
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Calcettinho",
    startupImage: [
      {
        url: "/icons/icon-512x512.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)"
      },
      {
        url: "/icons/icon-512x512.png",
        media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
      },
      {
        url: "/icons/icon-512x512.png",
        media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)"
      }
    ]
  },
  
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
  },
  
  // Icons optimized for PWA
  icons: {
    icon: [
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" }
    ],
    other: [
      { rel: "mask-icon", url: "/logo/simbolo.svg", color: "#00a273" }
    ]
  },
  
  // Enhanced OpenGraph for social sharing
  openGraph: {
    title: "Calcettinho ⚽ - App Calcetto Professionale",
    description: "App completa per gestire partite di calcetto con sistema di votazioni, statistiche avanzate e carte giocatori personalizzate",
    type: "website",
    locale: "it_IT",
    siteName: "Calcettinho",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Calcettinho - App Calcetto"
      }
    ]
  },
  
  // Twitter Card optimization
  twitter: {
    card: "summary_large_image",
    title: "Calcettinho ⚽",
    description: "App professionale per gestire partite di calcetto con statistiche e votazioni",
    images: ["/icons/icon-512x512.png"],
    creator: "@calcettinho"
  },
  
  // Additional PWA metadata
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "Calcettinho",
    "application-name": "Calcettinho",
    "msapplication-TileColor": "#00a273",
    "msapplication-config": "/browserconfig.xml",
    "msapplication-tap-highlight": "no",
    "format-detection": "telephone=no"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <head>
        {/* Enhanced PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Calcettinho" />
        <meta name="application-name" content="Calcettinho" />
        <meta name="msapplication-TileColor" content="#00a273" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Performance Optimizations */}
        <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="renderer" content="webkit" />
        
        {/* Cache Control for PWA */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        
        {/* PWA Theme Colors for different contexts */}
        <meta name="theme-color" content="#000000" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#00a273" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000000" />
        <meta name="msapplication-navbutton-color" content="#000000" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />
        
        {/* Preload critical resources for performance */}
        <link rel="preload" href="/fonts/Oswald-Bold.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/Nebulax-3lqLp.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        
        {/* DNS Prefetch for external resources */}
        <link rel="dns-prefetch" href="https://api.airtable.com" />
        <link rel="preconnect" href="https://api.airtable.com" />
        
        {/* Service Worker Registration Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && typeof window !== 'undefined') {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then((registration) => {
                      console.log('SW registered: ', registration);
                    })
                    .catch((registrationError) => {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black min-h-screen`}
      >
        <AuthProvider>
          <NotificationProvider>
            {children}
            <EvolutionToast />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
