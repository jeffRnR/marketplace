"use client";
// app/components/TopBar.tsx

import React, { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import logo from "@/images/logo.png";
import logo5 from "@/images/logo5.png";
import {
  CalendarPlus, Telescope, Store, Ticket,
  Menu, X, MessageCircle, ShoppingCart,
  Sun, Moon, Monitor,
} from "lucide-react";
import SearchBar       from "./SearchBar";
import NotificationBar from "./NotificationBar";
import SignInModal     from "./SignInModal";
import { useTheme } from "./ThemeProvider";

interface TopBarProps {
  onViewEvents?: () => void;
}

export default function TopBar({ onViewEvents }: TopBarProps) {
  const [scrolled,        setScrolled]       = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [mobileMenuOpen,  setMobileMenuOpen]  = useState(false);
  const [unreadMessages,  setUnreadMessages]  = useState(0);
  const { data: session, status } = useSession();
  const { mode, resolvedTheme, cycleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const fetchUnreadMessages = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res  = await fetch("/api/messages/unread-count");
      if (!res.ok) return;
      const data = await res.json();
      setUnreadMessages(data.unreadCount ?? 0);
    } catch { /* silent */ }
  }, [status]);

  useEffect(() => {
    fetchUnreadMessages();
    const id = setInterval(fetchUnreadMessages, 30_000);
    return () => clearInterval(id);
  }, [fetchUnreadMessages]);

  const handleSignOut   = async () => { await signOut({ redirect: false }); window.location.href = "/"; };
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const isLoading       = status === "loading";
  const isAuthenticated = status === "authenticated";

  // First name only for greeting
  const firstName = session?.user?.name?.split(" ")[0] ?? session?.user?.email?.split("@")[0] ?? "";

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
        <div className={`mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 transition-all duration-300 ${
          scrolled ? "shadow-sm shadow-black/10" : ""
        }`}>

          {/* Logo */}
          <div className="flex items-center lg:w-auto">
            <Link href="/" className="flex shrink-0 items-center gap-2 font-bold">
              <Image src={logo}  alt="logo" width={100} height={100} className="w-20 hidden lg:block" />
              <Image src={logo5} alt="logo" width={50}  height={50}  className="w-7 lg:hidden" />
              <span className="hidden text-sm font-bold tracking-[0.16em] text-[var(--foreground)] xl:block">NOIZY</span>
            </Link>
          </div>

          {/* Search + view events */}
          <div className="flex min-w-0 flex-1 items-center gap-3 lg:ml-8">
            {isAuthenticated && (
              <Link href="/events/all" className="hidden lg:block">
                <button className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--brand-green)] hover:text-[var(--brand-green)]">
                  <Telescope className="h-4 w-4" />
                  <span>Events</span>
                </button>
              </Link>
              
            )}
            <SearchBar />
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-3">
            <button onClick={cycleTheme} aria-label={`Switch to ${resolvedTheme === "dark" ? "day" : "night"} mode`} title={`Switch to ${resolvedTheme === "dark" ? "day" : "night"} mode`} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--brand-green)] hover:text-[var(--brand-green)]">
              {mode === "system" ? <Monitor className="h-4 w-4" /> : resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
            {isLoading ? (
              <div className="text-[var(--foreground)] text-sm">Loading...</div>
            ) : isAuthenticated ? (
              <>
                {/* Welcome greeting — desktop only */}
                {firstName && (
                    <span className="hidden lg:block lg:pr-2 text-[var(--muted)] text-sm">
                    Hi, <span className="text-[var(--brand-green)] font-semibold">{firstName}</span>
                  </span>
                )}

                {/* Notification bell */}
                <div className="flex items-center">
                  <NotificationBar />
                </div>

                {/* Desktop nav */}
                <div className="hidden lg:flex items-center gap-1 rounded-md border-[0.5px] border-[var(--brand-purple)]/35 bg-[var(--surface)] p-1 shadow-[0_8px_24px_rgba(68,45,112,0.1)]">
                  <Link href="/events/create">
                    <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]">
                      <CalendarPlus className="h-4 w-4" /><span>Create Event</span>
                    </button>
                  </Link>
                  <Link href="/my-events">
                    <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]">
                      <Ticket className="h-4 w-4" /><span>My Events</span>
                    </button>
                  </Link>
                  <Link href="/marketplace">
                    <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]">
                      <Store className="h-4 w-4" /><span>Marketplace</span>
                    </button>
                  </Link>
                  <Link href="/messages">
                    <button className="relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]">
                      <MessageCircle className="h-4 w-4" /><span>Messages</span>
                      {unreadMessages > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {unreadMessages > 9 ? "9+" : unreadMessages}
                        </span>
                      )}
                    </button>
                  </Link>
                  <Link href="/bookings">
                    <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]">
                      <ShoppingCart className="h-4 w-4" /><span>Bookings</span>
                    </button>
                  </Link>
                  <button onClick={handleSignOut}
                    className="rounded-xl border border-[var(--brand-purple)]/40 px-3 py-2 text-sm font-semibold text-[var(--brand-purple)] transition hover:bg-[var(--brand-purple)] hover:text-white">
                    Logout
                  </button>
                </div>

                {/* Mobile hamburger */}
                  <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden text-[var(--foreground)] hover:text-[var(--brand-purple)] transition-all duration-300">
                  <div className="relative w-6 h-6">
                    <Menu className={`h-6 w-6 absolute transition-all duration-300 ${mobileMenuOpen ? "rotate-180 opacity-0" : "rotate-0 opacity-100"}`} />
                    <X    className={`h-6 w-6 absolute transition-all duration-300 ${mobileMenuOpen ? "rotate-0 opacity-100" : "-rotate-180 opacity-0"}`} />
                  </div>
                </button>
              </>
            ) : (
              <>
                <Link href="/events">
                  <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:text-[var(--brand-green)]">
                    <span>View Events</span><Telescope className="h-4 w-4" />
                  </button>
                </Link>
                <button onClick={() => setShowSignInModal(true)}
                  className="rounded-xl border border-[var(--brand-purple)]/40 px-3 py-2 text-sm font-semibold text-[var(--brand-purple)] transition hover:bg-[var(--brand-purple)] hover:text-white">
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Mobile menu ── */}
        {mobileMenuOpen && isAuthenticated && (
          <div className="lg:hidden fixed inset-0 z-40 flex items-start justify-center pt-24 min-h-screen bg-black/50 backdrop-blur-lg">
            <div className="w-[calc(100%-2rem)] max-w-2xl rounded-xl border-[0.5px] border-[var(--brand-purple)]/35 bg-[var(--surface)] p-5 shadow-[0_20px_50px_rgba(68,45,112,0.2)] transition duration-300 relative mx-4">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2 className="text-lg font-bold text-[var(--foreground)]">Menu</h2>
                  
                </div>
                <button onClick={closeMobileMenu} className="text-[var(--brand-purple)] font-bold text-xl hover:opacity-70 transition">×</button>
              </div>
              <div className="border-t-2 border-[var(--brand-purple)]/25 my-2" />
              <div className="space-y-1">
                {[
                  { href: "/events/create", icon: <CalendarPlus className="h-5 w-5" />, label: "Create Event" },
                  { href: "/events",        icon: <Telescope className="h-5 w-5" />,    label: "Discover" },
                  { href: "/my-events",     icon: <Ticket className="h-5 w-5" />,       label: "My Events" },
                  { href: "/marketplace",   icon: <Store className="h-5 w-5" />,        label: "Marketplace" },
                  { href: "/bookings",      icon: <ShoppingCart className="h-5 w-5" />, label: "Bookings" },
                ].map(({ href, icon, label }) => (
                  <Link key={href} href={href} onClick={closeMobileMenu}>
                    <button className="w-full text-left text-[var(--foreground)] font-semibold text-sm rounded-lg hover:bg-[var(--surface-muted)] hover:text-[var(--brand-purple)] p-3 transition flex gap-3 items-center">
                      {icon}<span>{label}</span>
                    </button>
                  </Link>
                ))}

                {/* Messages with badge */}
                <Link href="/messages" onClick={closeMobileMenu}>
                  <button className="w-full text-left text-[var(--foreground)] font-semibold text-sm rounded-lg hover:bg-[var(--surface-muted)] hover:text-[var(--brand-purple)] p-3 transition flex gap-3 items-center justify-between">
                    <span className="flex gap-3 items-center"><MessageCircle className="h-5 w-5" /><span>Messages</span></span>
                    {unreadMessages > 0 && (
                      <span className="bg-[var(--brand-purple)] text-white text-xs font-bold rounded-md px-2 py-0.5">{unreadMessages}</span>
                    )}
                  </button>
                </Link>

                <div className="border-t-2 border-[var(--brand-purple)]/25 my-2" />
                <button onClick={() => { handleSignOut(); closeMobileMenu(); }}
                  className="w-full text-[var(--foreground)] font-semibold px-4 py-3 text-sm rounded-lg hover:bg-red-700 hover:text-gray-100 transition border-[0.5px] border-red-700/50">
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSignInModal && <SignInModal onClose={() => setShowSignInModal(false)} />}
    </>
  );
}