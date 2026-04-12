export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ReelRank API',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
