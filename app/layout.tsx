import type { Metadata } from 'next';
import './globals.css';

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
        className="antialiased"
      >
        {children}
      </body>
    </html>
  );
}
