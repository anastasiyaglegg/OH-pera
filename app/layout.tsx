import type { Metadata } from 'next';
import { Geist, Geist_Mono, Bodoni_Moda } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const displayFont = Bodoni_Moda({variable: '--font-display', subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], display: 'swap'});

export const metadata: Metadata = {
  title: 'OH-pera! — Your private opera circle',
  description: 'A private opera club that grows one personal invitation at a time.',
  openGraph: {
    title: 'OH-pera! — Your private opera circle',
    description: 'Share an opera evening with the people you know.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OH-pera! — Your private opera circle',
    description: 'Share an opera evening with the people you know.',
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
        className={`${geistSans.variable} ${geistMono.variable} ${displayFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
