import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { NotificationProvider } from './contexts/NotificationContext';
import EvolutionToast from './components/EvolutionToast';
import Navigation from './components/Navigation';
import OfflineStatusIndicator from '../components/OfflineStatusIndicator';

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
        
        {/* Enhanced Service Worker Registration with Offline Systems */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && typeof window !== 'undefined') {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                  }).then(function(registration) {
                    console.log('🎯 SW registered successfully:', registration.scope);
                    
                    // Initialize offline systems after SW is ready
                    registration.addEventListener('updatefound', () => {
                      console.log('🔄 SW update found');
                    });
                    
                  }).catch(function(error) {
                    console.log('❌ SW registration failed:', error);
                  });

                  // Background sync listener
                  navigator.serviceWorker.addEventListener('message', event => {
                    if (event.data.type === 'BACKGROUND_SYNC') {
                      console.log('🔄 Background sync completed:', event.data.tag);
                    }
                  });
                });

                // Initialize offline queue and sync on load
                window.addEventListener('load', () => {
                  // Import and initialize offline systems with dynamic imports
                  setTimeout(() => {
                    if (typeof window !== 'undefined' && 'indexedDB' in window) {
                      // Initialize smart cache (default export)
                      import('../../utils/smartCache').then((module) => {
                        if (module.default) {
                          console.log('💾 Smart cache initialized');
                        }
                      }).catch(err => console.warn('Smart cache init failed:', err));
                      
                      // Initialize offline queue (named export)
                      import('../../utils/offlineQueue').then((module) => {
                        if (module.offlineQueue) {
                          console.log('📦 Offline queue initialized');
                        }
                      }).catch(err => console.warn('Offline queue init failed:', err));
                      
                      // Initialize data sync manager (named export)
                      import('../../utils/dataSyncManager').then((module) => {
                        if (module.dataSyncManager) {
                          console.log('📡 Data sync manager initialized');
                          // Start initial sync if online
                          if (typeof navigator !== 'undefined' && navigator.onLine) {
                            module.dataSyncManager.prioritySync().catch(err => {
                              console.warn('Initial sync failed:', err);
                            });
                          }
                        }
                      }).catch(err => console.warn('Data sync manager init failed:', err));
                    }
                  }, 100); // Small delay to ensure DOM is ready
                });

                // PWA Install prompt optimization
                let deferredPrompt;
                window.addEventListener('beforeinstallprompt', (e) => {
                  e.preventDefault();
                  deferredPrompt = e;
                  console.log('💾 PWA install prompt ready');
                  
                  // Store for PWA install button
                  window.deferredPrompt = deferredPrompt;
                });

                // Performance monitoring
                window.addEventListener('load', () => {
                  if ('performance' in window) {
                    setTimeout(() => {
                      const perfData = performance.getEntriesByType('navigation')[0];
                      if (perfData) {
                        console.log('⚡ Page load time:', Math.round(perfData.loadEventEnd - perfData.fetchStart), 'ms');
                      }
                    }, 0);
                  }
                });

                // Network status monitoring
                window.addEventListener('online', () => {
                  console.log('🌐 Network: Online');
                  // Trigger sync when back online
                  if (window.dataSyncManager) {
                    window.dataSyncManager.prioritySync();
                  }
                });

                window.addEventListener('offline', () => {
                  console.log('📱 Network: Offline - Switching to offline mode');
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
            <div className="flex flex-col min-h-screen">
              {/* Navigation */}
              <Navigation />
              
              {/* Main Content */}
              <main className="flex-1 relative">
                {children}
              </main>
              
              {/* Offline Status Indicator - Fixed Position */}
              <OfflineStatusIndicator />
            </div>
            <EvolutionToast />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
