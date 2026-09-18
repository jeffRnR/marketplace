// app/layout.tsx
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import TopBarClient    from "@/components/TopBarClient";
import FooterClient    from "@/components/FooterClient";
import NextAuthProvider from "@/components/NextAuthProvider";
import BackButton      from "@/components/BackButton";
import type { Metadata } from "next";
import { headers }     from "next/headers";
import ThemeProvider from "@/components/ThemeProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets:  ["latin"],
  weight:   ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title:       "Noizy Hub",
  description: "Kenya's event ticketing, vendor marketplace, and admission platform.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const isWaitlist  = headersList.get("x-is-waitlist") === "1";

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        {isWaitlist ? (
          // Waitlist route — completely bare, no session, no chrome
          <>{children}</>
        ) : (
          <ThemeProvider>
            <NextAuthProvider>
              <TopBarClient />
              <BackButton />
              <main className="page-reveal mt-0 flex-grow pt-24">{children}</main>
              <FooterClient />
            </NextAuthProvider>
          </ThemeProvider>
        )}
      </body>
    </html>
  );
}