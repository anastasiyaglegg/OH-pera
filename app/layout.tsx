import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'OH-pera! — Opera across New York City',
  description: 'Discover upcoming opera performances from five New York City organizations in one simple place.',
  openGraph: {
    title: 'OH-pera! — Opera across New York City',
    description: 'Opera across New York City, all in one place.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OH-pera! — Opera across New York City',
    description: 'Opera across New York City, all in one place.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
