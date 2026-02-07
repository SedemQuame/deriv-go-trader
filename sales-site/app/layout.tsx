import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://derivautotrader.com";

export const metadata: Metadata = {
  title: {
    default: "Deriv Trader - Automated Trading Bot for Deriv",
    template: "%s | Deriv Trader",
  },
  description:
    "The ultimate desktop trading bot for Deriv. Automate your trading with advanced strategies, real-time analytics, and cross-platform performance on Windows, Mac, and Linux.",
  keywords: [
    "Deriv",
    "trading bot",
    "automated trading",
    "Deriv trader",
    "binary options",
    "trading software",
    "desktop trading app",
  ],
  authors: [{ name: "Deriv Trader Tooling" }],
  creator: "Deriv Trader Tooling",
  publisher: "Deriv Trader Tooling",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Deriv Trader",
    title: "Deriv Trader - Automated Trading Bot for Deriv",
    description:
      "Automate your trading with advanced strategies, real-time analytics, and cross-platform performance.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Deriv Trader - Automated Trading Bot",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Deriv Trader - Automated Trading Bot for Deriv",
    description:
      "Automate your trading with advanced strategies, real-time analytics, and cross-platform performance.",
    images: ["/og-image.png"],
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
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0e" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Script to prevent theme flash
const themeScript = `
  (function() {
    const savedTheme = localStorage.getItem('deriv-theme');
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

