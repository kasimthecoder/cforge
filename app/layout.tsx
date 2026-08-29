import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kasim Saifi CForge Studio',
  description: 'Student-friendly C IDE with saved code history and secure authentication.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
