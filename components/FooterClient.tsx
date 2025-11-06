"use client";

import Footer from "./Footer";
import { SessionProvider } from "next-auth/react"; // only if Footer needs session

export default function FooterClient() {
  return (
    <SessionProvider>
      <Footer />
    </SessionProvider>
  );
}
