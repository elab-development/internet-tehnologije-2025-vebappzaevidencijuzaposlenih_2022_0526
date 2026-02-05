// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../components/AuthProvider";
import Nav from "../components/nav";

export const metadata: Metadata = {
  title: "Evidencija prisustva zaposlenih",
  description: "Projekat iz Internet tehnologija",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sr">
      <body className="antialiased">
        <AuthProvider>
          <Nav />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
