import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { BottomNav } from "@/components/BottomNav";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: "Moon Tracker",
  description: "Track the Moon — position, visibility, and tonight's altitude chart.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Moon Tracker",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#030712",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-full bg-[#030712] text-white">
        <AppProvider>
          <ServiceWorkerRegistrar />
          {/* Main content — padded so it clears the bottom nav */}
          <main className="max-w-lg mx-auto pb-24 min-h-screen" style={{ paddingTop: "max(env(safe-area-inset-top), 1.5rem)" }}>
            {children}
          </main>
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  );
}
