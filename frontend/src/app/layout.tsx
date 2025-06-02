import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from './contexts/NotificationContext';
import EvolutionToast from './components/EvolutionToast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#00a273',
}

export const metadata: Metadata = {
  title: "Calcettinho",
  description: "App per gestire partite di calcetto con carte giocatori personalizzate",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Calcettinho",
    startupImage: [
      {
        url: "/icons/icon-512x512.png",
        media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)"
      }
    ]
  },
  formatDetection: {
    telephone: false,
  },
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
  openGraph: {
    title: "Calcettinho",
    description: "App per gestire partite di calcetto con carte giocatori personalizzate",
    type: "website",
    locale: "it_IT",
    images: [
      {
        url: "/icons/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "Calcettinho Logo"
      }
    ]
  },
  twitter: {
    card: "summary",
    title: "Calcettinho",
    description: "App per gestire partite di calcetto con carte giocatori personalizzate",
    images: ["/icons/icon-512x512.png"]
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
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Calcettinho" />
        <meta name="application-name" content="Calcettinho" />
        <meta name="msapplication-TileColor" content="#00a273" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <link rel="apple-touch-icon" href="/icons/icon-180x180.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-green-50 to-blue-50 min-h-screen`}
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
