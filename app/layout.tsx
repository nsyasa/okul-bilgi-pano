import "./globals.css";

export const metadata = {
  title: "Okul Pano - Player",
  description: "Okul bilgi ekranı (TV Player)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
