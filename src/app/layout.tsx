import type { Metadata } from "next";
import { Bebas_Neue, Cormorant_Garamond } from "next/font/google";
import "@/styles/globals.css";
import { TransitionProvider } from "@/context/TransitionContext";
import { CustomCursor } from "@/components/ui/CustomCursor";

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas-neue",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-cormorant-garamond",
  display: "swap",
});

export const metadata: Metadata = {
  title: "InnerPlay — Interactive Storytelling You Experience With Your Eyes Closed",
  description:
    "A new kind of game. No screen. No UI. Close your eyes, speak, and play inside your imagination. Voice-powered interactive storytelling powered by Gemini Live.",
  keywords: [
    "interactive storytelling",
    "voice game",
    "audio adventure",
    "AI storytelling",
    "eyes closed game",
    "Gemini Live",
    "immersive fiction",
    "voice-powered game",
  ],
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "InnerPlay — Interactive Storytelling You Experience With Your Eyes Closed",
    description:
      "A new kind of game. No screen. No UI. Close your eyes, speak, and play inside your imagination. Voice-powered interactive storytelling powered by Gemini Live.",
    url: "https://innerplay.app",
    siteName: "InnerPlay",
    type: "website",
    images: [
      {
        url: "https://innerplay.app/images/stories/the-last-session/card.webp",
        width: 1200,
        height: 675,
        alt: "InnerPlay — The Last Session",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "InnerPlay — Interactive Storytelling You Experience With Your Eyes Closed",
    description:
      "Close your eyes. Speak. Play. A new kind of interactive storytelling you experience inside your imagination.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://innerplay.app/#webapp",
      name: "InnerPlay",
      description:
        "A new kind of game. No screen. No UI. Close your eyes, speak, and play inside your imagination. Voice-powered interactive storytelling powered by Gemini Live.",
      url: "https://innerplay.app",
      applicationCategory: "Game",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://innerplay.app/#organization",
      name: "InnerPlay",
      url: "https://innerplay.app",
      logo: {
        "@type": "ImageObject",
        url: "https://innerplay.app/images/innerplay-logo.svg",
        width: 512,
        height: 512,
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${cormorantGaramond.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a href="#main-content" className="skip-to-content">
          Skip to content
        </a>
        <TransitionProvider>
          <CustomCursor />
          {children}
        </TransitionProvider>
      </body>
    </html>
  );
}
