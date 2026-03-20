"use client";

import { SessionProvider } from "next-auth/react";
import TopBar from "./TopBar";

export default function TopBarClient() {
  return (
    <SessionProvider>
      <TopBar />
    </SessionProvider>
  );
}
