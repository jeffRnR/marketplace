// app/components/TopBar.tsx

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import logo from "@/images/logo.png";
import logo5 from "@/images/logo5.png";
import {
  CalendarPlus,
  Telescope,
  Store,
  Ticket,
  Menu,
  X,
  MessageCircle,
  ShoppingCart,
  Sun,
  Moon,
  Monitor,
  Home,
} from "lucide-react";
import SearchBar from "./SearchBar";
import NotificationBar from "./NotificationBar";
import SignInModal from "./SignInModal";
import { useTheme } from "./ThemeProvider";

interface TopBarProps {
  onViewEvents?: () => void;
}

export default function TopBar({ onViewEvents }: TopBarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

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
      const res = await fetch("/api/messages/unread-count");

      if (!res.ok) return;

      const data = await res.json();
      setUnreadMessages(data.unreadCount ?? 0);
    } catch {
      /* silent */
    }
  }, [status]);

  useEffect(() => {
    fetchUnreadMessages();

    const id = setInterval(fetchUnreadMessages, 30_000);

    return () => clearInterval(id);
  }, [fetchUnreadMessages]);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    window.location.href = "/";
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  const firstName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.email?.split("@")[0] ??
    "";

  const themeButton = (
    <button
      onClick={cycleTheme}
      aria-label={`Switch to ${
        resolvedTheme === "dark" ? "day" : "night"
      } mode`}
      title={`Switch to ${
        resolvedTheme === "dark" ? "day" : "night"
      } mode`}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--brand-green)] hover:text-[var(--brand-green)]"
    >
      {mode === "system" ? (
        <Monitor className="h-4 w-4" />
      ) : resolvedTheme === "dark" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </button>
  );

  const mobileMenuButton = (
    <button
      onClick={() => setMobileMenuOpen((open) => !open)}
      aria-label="Toggle menu"
      aria-expanded={mobileMenuOpen}
      className="flex h-9 w-9 shrink-0 items-center justify-center text-[var(--foreground)] transition-all duration-300 hover:text-purple-500 lg:hidden"
    >
      <div className="relative h-6 w-6">
        <Menu
          className={`absolute h-6 w-6 transition-all duration-300 ${
            mobileMenuOpen
              ? "rotate-180 opacity-0"
              : "rotate-0 opacity-100"
          }`}
        />

        <X
          className={`absolute h-6 w-6 transition-all duration-300 ${
            mobileMenuOpen
              ? "rotate-0 opacity-100"
              : "-rotate-180 opacity-0"
          }`}
        />
      </div>
    </button>
  );

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-xl">
        <div
          className={`mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 transition-all duration-300 sm:gap-3 sm:px-4 sm:py-3 ${
            scrolled ? "shadow-sm shadow-black/10" : ""
          }`}
        >
          {/* Logo */}
          <div className="flex items-center lg:w-auto">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 font-bold"
            >
              <Image
                src={logo}
                alt="logo"
                width={100}
                height={100}
                className="hidden w-20 lg:block"
              />

              <Image
                src={logo5}
                alt="logo"
                width={50}
                height={50}
                className="w-7 lg:hidden"
              />
            </Link>
          </div>

          {/* Search + Events */}
          <div className="flex min-w-0 flex-1 items-center gap-2 lg:ml-8 lg:gap-3">
            <Link href="/events/all" className="hidden lg:block">
              <button className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--brand-green)] hover:text-[var(--brand-green)]">
                <Telescope className="h-4 w-4" />
                <span>Events</span>
              </button>
            </Link>

            <SearchBar />
          </div>

          {/* Right side */}
          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
            {isLoading ? (
              <div className="hidden text-sm text-[var(--foreground)] sm:block">
                Loading...
              </div>
            ) : isAuthenticated ? (
              <>
                {/* Mobile greeting */}
                {firstName && (
                  <span className="max-w-[90px] truncate text-xs text-[var(--muted)] sm:hidden px-4">
                    Hi,{" "}
                    <span className="font-semibold text-[var(--brand-green)]">
                      {firstName}
                    </span>
                  </span>
                )}

                {/* Desktop greeting */}
                {firstName && (
                  <span className="hidden pr-2 text-sm text-[var(--muted)] lg:block">
                    Hi,{" "}
                    <span className="font-semibold text-[var(--brand-green)]">
                      {firstName}
                    </span>
                  </span>
                )}

                {/* Notification */}
                <div className="hidden items-center sm:flex">
                  <NotificationBar />
                </div>

                {/* Desktop navigation */}
                <div className="hidden items-center gap-1 bg-transparent p-1 lg:flex">
                  <Link href="/events/create">
                    <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]">
                      <CalendarPlus className="h-4 w-4" />
                      <span>Create Event</span>
                    </button>
                  </Link>

                  <Link href="/my-events">
                    <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]">
                      <Ticket className="h-4 w-4" />
                      <span>My Events</span>
                    </button>
                  </Link>

                  <Link href="/marketplace">
                    <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]">
                      <Store className="h-4 w-4" />
                      <span>Marketplace</span>
                    </button>
                  </Link>

                  <Link href="/messages">
                    <button className="relative flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]">
                      <MessageCircle className="h-4 w-4" />
                      <span>Messages</span>

                      {unreadMessages > 0 && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                          {unreadMessages > 9 ? "9+" : unreadMessages}
                        </span>
                      )}
                    </button>
                  </Link>

                  <Link href="/bookings">
                    <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]">
                      <ShoppingCart className="h-4 w-4" />
                      <span>Bookings</span>
                    </button>
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="rounded-xl bg-red-600/50 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700/50"
                  >
                    Sign Out
                  </button>
                </div>

                {/* Mobile theme */}
                <div className="lg:hidden">
                  {themeButton}
                </div>

                {/* Mobile hamburger */}
                {mobileMenuButton}

                {/* Desktop theme */}
                <div className="hidden lg:block">
                  {themeButton}
                </div>
              </>
            ) : (
              <>
                {/* Public desktop links */}
                <Link href="/events">
                  <button className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:text-[var(--brand-green)] sm:flex">
                    <span>View Events</span>
                    <Telescope className="h-4 w-4" />
                  </button>
                </Link>

                <Link href="/events/create">
                  <button className="hidden items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:text-[var(--brand-green)] lg:flex">
                    <CalendarPlus className="h-4 w-4" />
                    <span>Create Event</span>
                  </button>
                </Link>

                <Link href="/marketplace">
                  <button className="hidden items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:text-[var(--brand-green)] lg:flex">
                    <Store className="h-4 w-4" />
                    <span>Marketplace</span>
                  </button>
                </Link>

                <button
                  onClick={() => setShowSignInModal(true)}
                  className="hidden rounded-xl bg-[var(--brand-purple)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-purple)]/50 sm:block"
                >
                  Sign In
                </button>

                {/* Mobile theme */}
                <div className="lg:hidden">
                  {themeButton}
                </div>

                {/* Mobile hamburger */}
                {mobileMenuButton}

                {/* Desktop theme */}
                <div className="hidden lg:block">
                  {themeButton}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex min-h-screen items-start justify-center bg-black/50 pt-20 backdrop-blur-lg sm:pt-24 lg:hidden">
            <div className="relative mx-3 w-[calc(100%-1.5rem)] max-w-md rounded-xl border-[0.5px] border-[var(--brand-purple)]/35 bg-[var(--surface)] p-4 shadow-[0_20px_50px_rgba(68,45,112,0.2)] sm:mx-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[var(--foreground)]">
                  Menu
                </h2>

                <button
                  onClick={closeMobileMenu}
                  className="text-xl font-bold text-purple-500 transition hover:opacity-70"
                  aria-label="Close menu"
                >
                  ×
                </button>
              </div>

              <div className="my-2 border-t border-[var(--brand-purple)]/25" />

              <div className="space-y-0.5">
                {/* Always available */}
                {[
                  {
                    href: "/",
                    icon: <Home className="h-5 w-5" />,
                    label: "Home",
                  },
                  {
                    href: "/events/create",
                    icon: <CalendarPlus className="h-5 w-5" />,
                    label: "Create Event",
                  },
                  {
                    href: "/events",
                    icon: <Telescope className="h-5 w-5" />,
                    label: "Discover",
                  },
                  {
                    href: "/marketplace",
                    icon: <Store className="h-5 w-5" />,
                    label: "Marketplace",
                  },
                ].map(({ href, icon, label }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMobileMenu}
                  >
                    <button className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] hover:text-purple-500">
                      {icon}
                      <span>{label}</span>
                    </button>
                  </Link>
                ))}

                {/* Authenticated only */}
                {isAuthenticated && (
                  <>
                    <Link
                      href="/my-events"
                      onClick={closeMobileMenu}
                    >
                      <button className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] hover:text-purple-500">
                        <Ticket className="h-5 w-5" />
                        <span>My Events</span>
                      </button>
                    </Link>

                    <Link
                      href="/bookings"
                      onClick={closeMobileMenu}
                    >
                      <button className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] hover:text-purple-500">
                        <ShoppingCart className="h-5 w-5" />
                        <span>Bookings</span>
                      </button>
                    </Link>

                    <Link
                      href="/messages"
                      onClick={closeMobileMenu}
                    >
                      <button className="flex w-full items-center justify-between rounded-lg p-2.5 text-left text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-muted)] hover:text-purple-500">
                        <span className="flex items-center gap-3">
                          <MessageCircle className="h-5 w-5" />
                          <span>Messages</span>
                        </span>

                        {unreadMessages > 0 && (
                          <span className="rounded-md bg-[var(--brand-purple)] px-2 py-0.5 text-xs font-bold text-white">
                            {unreadMessages > 9 ? "9+" : unreadMessages}
                          </span>
                        )}
                      </button>
                    </Link>

                    <div className="my-2 border-t border-[var(--brand-purple)]/25" />

                    <button
                      onClick={() => {
                        handleSignOut();
                        closeMobileMenu();
                      }}
                      className="w-full rounded-lg bg-red-600/50 px-4 py-2.5 text-left text-sm font-semibold text-[var(--foreground)] transition hover:bg-red-700/50 hover:text-gray-100"
                    >
                      Sign out
                    </button>
                  </>
                )}

                {/* Guest sign in */}
                {!isAuthenticated && (
                  <>
                    <div className="my-2 border-t border-[var(--brand-purple)]/25" />

                    <button
                      onClick={() => {
                        closeMobileMenu();
                        setShowSignInModal(true);
                      }}
                      className="w-full rounded-lg bg-[var(--brand-purple)] px-4 py-2.5 text-left text-sm font-semibold transition hover:bg-[var(--brand-purple)]/50 hover:text-white"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showSignInModal && (
        <SignInModal onClose={() => setShowSignInModal(false)} />
      )}
    </>
  );
}