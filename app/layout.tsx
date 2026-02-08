import "./globals.css";

import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "Okul Pano - Player",
  description: "Okul bilgi ekranı (TV Player)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#333",
              color: "#fff",
              zIndex: 9999,
            },
          }}
        />
      </body>
    </html>
  );
}
