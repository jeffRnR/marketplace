// app/layout.tsx
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import TopBarClient from "@/components/TopBarClient";
import FooterClient from "@/components/FooterClient";
import NextAuthProvider from "@/components/NextAuthProvider";
import type { Metadata } from "next";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Noizy Marketplace",
  description: "Multi-vendor marketplace for events and entertainment",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${poppins.variable} ${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <NextAuthProvider>
          <TopBarClient />
          <main className="mt-4 flex-grow">{children}</main>
          <FooterClient />
        </NextAuthProvider>
      </body>
    </html>
  );
}