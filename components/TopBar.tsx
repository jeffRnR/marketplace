"use client";

import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import logo from "@/images/logo.png";
import logo5 from "@/images/logo5.png";
import { CalendarPlus, Telescope, Store, Ticket, Menu, X } from "lucide-react";
import SearchBar from "./SearchBar";
import NotificationBar from "./NotificationBar";
import SignInModal from "./SignInModal";

interface TopBarProps {
  onViewEvents?: () => void;
}

export default function TopBar({ onViewEvents }: TopBarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    window.location.href = "/";
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md">
        <div
          className={`flex items-center gap-3 p-4 transition-all duration-300 ${
            scrolled
              ? "shadow-xs shadow-gray-400 border-b border-gray-400"
              : "border-b border-gray-400/50"
          }`}
        >
          {/* Logo */}
          <div className="flex items-center lg:w-auto">
            <Link href="/" className="font-bold shrink-0">
              <Image
                src={logo}
                alt="logo"
                width={100}
                height={100}
                className="w-20 hidden lg:block"
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

          {/* Search bar + Create event always visible on mobile & desktop */}
          <div className="flex items-center gap-3 ml-2 lg:ml-10 flex-1">
            {isAuthenticated && (
              <Link href="/events">
                <button className="text-gray-300 font-bold text-sm rounded-lg hover:text-gray-100 hover:cursor-pointer transition flex gap-2 items-center">
                  <Telescope className="h-4 w-4" />
                  <span>View events</span>
                </button>
              </Link>
            )}
            <SearchBar />
          </div>

          {/* Right side actions */}
          <div className="ml-auto flex items-center gap-3">
            {isLoading ? (
              <div className="text-gray-400 text-sm">Loading...</div>
            ) : isAuthenticated ? (
              <>
                {/* Notification Icon always visible when logged in */}
                <NotificationBar />

                {/* Desktop navigation links */}
                <div className="hidden lg:flex items-center gap-4 px-4">
                  <Link href="/events/create" onClick={closeMobileMenu}>
                    <button className="text-gray-300 font-bold text-sm rounded-lg hover:text-gray-100 hover:cursor-pointer transition flex gap-2 items-center">
                      <CalendarPlus className="h-4 w-4" />
                      <span>Create Event</span>
                    </button>
                  </Link>
                  <Link href="/events">
                    <button className="text-gray-300 font-bold text-sm rounded-lg hover:text-gray-100 hover:cursor-pointer transition flex gap-2 items-center">
                      <Telescope className="h-4 w-4" />
                      <span>Discover</span>
                    </button>
                  </Link>

                  <Link href="/my-events">
                    <button className="text-gray-300 font-bold text-sm rounded-lg hover:text-gray-100 hover:cursor-pointer transition flex gap-2 items-center">
                      <Ticket className="h-4 w-4" />
                      <span>My Events</span>
                    </button>
                  </Link>

                  <Link href="/marketplace">
                    <button className="text-gray-300 font-bold text-sm rounded-lg hover:text-gray-100 hover:cursor-pointer transition flex gap-2 items-center">
                      <Store className="h-4 w-4" />
                      <span>Marketplace</span>
                    </button>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-gray-300 font-bold px-2 py-1 text-sm rounded-lg hover:bg-gray-200 hover:text-gray-800 hover:cursor-pointer transition duration-300 border border-gray-400"
                  >
                    Logout
                  </button>
                </div>
                

                {/* Mobile hamburger menu */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden text-gray-300 hover:text-gray-100 transition-all duration-300"
                >
                  <div className="relative w-6 h-6">
                    <Menu
                      className={`h-6 w-6 absolute transition-all duration-300 ${
                        mobileMenuOpen
                          ? "rotate-180 opacity-0"
                          : "rotate-0 opacity-100"
                      }`}
                    />
                    <X
                      className={`h-6 w-6 absolute transition-all duration-300 ${
                        mobileMenuOpen
                          ? "rotate-0 opacity-100"
                          : "-rotate-180 opacity-0"
                      }`}
                    />
                  </div>
                </button>
              </>
            ) : (
              <>
                {/* Not authenticated: View Events + Sign In */}
                <Link href="/events">
                  <button className="text-gray-300 font-bold text-sm rounded-lg hover:text-gray-100 hover:cursor-pointer transition flex gap-2 items-center">
                    <span>View Events</span>
                    <Telescope className="h-4 w-4" />
                  </button>
                </Link>
                <button
                  onClick={() => setShowSignInModal(true)}
                  className="text-gray-300 font-bold px-2 py-1 text-sm rounded-lg hover:bg-gray-200 hover:text-gray-800 hover:cursor-pointer transition duration-300 border border-gray-400"
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && isAuthenticated && (
          <div className="lg:hidden fixed inset-0 z-40 flex items-start justify-center pt-24 min-h-screen bg-black/50 backdrop-blur-lg">
            <div className="w-[70%] max-w-2xl rounded-2xl bg-gray-300 p-6 shadow-md transition duration-300 relative mx-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-gray-800">Menu</h2>
                <button
                  onClick={closeMobileMenu}
                  className="text-purple-800 font-bold text-xl hover:text-purple-600 hover:cursor-pointer transition"
                >
                  ×
                </button>
              </div>
              <div className="border-t border-gray-400 my-2" />

              <div className="space-y-3">
                {/* Redundant Create Event + Search for convenience */}
                <Link href="/events/create" onClick={closeMobileMenu}>
                  <button className="w-full text-left text-gray-800 font-bold text-sm rounded-lg hover:bg-purple-800 hover:text-gray-100 p-3 transition duration-300 flex gap-3 items-center">
                    <CalendarPlus className="h-5 w-5" />
                    <span>Create Event</span>
                  </button>
                </Link>

                <Link href="/events" onClick={closeMobileMenu}>
                  <button className="w-full text-left text-gray-800 font-bold text-sm rounded-lg hover:bg-purple-800 hover:text-gray-100 p-3 transition duration-300 flex gap-3 items-center">
                    <Telescope className="h-5 w-5" />
                    <span>Discover</span>
                  </button>
                </Link>

                <Link href="/my-events" onClick={closeMobileMenu}>
                  <button className="w-full text-left text-gray-800 font-bold text-sm rounded-lg hover:bg-purple-800 hover:text-gray-100 p-3 transition duration-300 flex gap-3 items-center">
                    <Ticket className="h-5 w-5" />
                    <span>My Events</span>
                  </button>
                </Link>

                <Link href="/marketplace" onClick={closeMobileMenu}>
                  <button className="w-full text-left text-gray-800 font-bold text-sm rounded-lg hover:bg-purple-800 hover:text-gray-100 p-3 transition duration-300 flex gap-3 items-center">
                    <Store className="h-5 w-5" />
                    <span>Marketplace</span>
                  </button>
                </Link>

                <div className="border-t border-gray-400 my-3" />

                <button
                  onClick={() => {
                    handleSignOut();
                    closeMobileMenu();
                  }}
                  className="w-full text-gray-800 font-bold px-4 py-3 text-sm rounded-lg hover:bg-red-700 hover:text-gray-100 transition duration-300 hover:cursor-pointer border-2 border-red-700/50"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sign In Modal */}
      {showSignInModal && (
        <SignInModal onClose={() => setShowSignInModal(false)} />
      )}
    </>
  );
}
