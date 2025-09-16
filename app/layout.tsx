import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";
// import "@/lib/fontawesome";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"]
});

export const metadata: Metadata = {
  title: "Noizy Marketplace",
  description:
    "This is a multi-vendor ecommerce marketplace for event brands and entertainment related brands",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${poppins.variable} ${geistSans.variable} antialiased min-h-screen flex flex-col`}
        >
          {/* top navigation bar */}
          <TopBar />

          {/* main content grows to fill space */}
          <main className="mt-4 flex-grow">{children}</main>

          {/* footer sits at the bottom */}
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}

