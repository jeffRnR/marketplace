"use client";

import React, { useEffect, useState } from "react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import logo from "@/images/logo.png";
import logo5 from "@/images/logo5.png";
import { CalendarPlus, Telescope, Store, Ticket } from "lucide-react";
import SearchBar from "./SearchBar";
import NotificationBar from "./NotificationBar";

interface TopBarProps {
  onViewEvents?: () => void;
}

function TopBar({ onViewEvents }: TopBarProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 0) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md"
    >
      <div
        className={`flex flex-row items-center gap-4 p-4 transition-all duration-300 
        ${
          scrolled
            ? "shadow-md border-b border-gray-400/50"
            : "border-b border-transparent"
        }`}
      >
        <div className="flex items-center lg:w-auto">
          <Link href="/" className="font-bold shrink-0">
            <Image
              src={logo}
              alt="logo"
              width={100}
              height={100}
              className="w-20 lg:w-22 hidden lg:block"
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

        <div className="lg:ml-20">
          <SignedIn>
            <div className="flex items-center gap-2 lg:gap-4">
              <Link href="/events/create">
                <button className=" text-gray-300 font-bold lg:text-md text-sm rounded-lg hover:text-gray-100 hover:cursor-pointer transition duration-300 flex gap-2 items-center justify-center">
                  <CalendarPlus className="h-4 w-4" />
                  <span>Create Event</span>
                </button>
              </Link>

              {/* search bar */}
              <div>
                <SearchBar />
              </div>
            </div>
          </SignedIn>
        </div>

        <div className="ml-auto">
          <SignedIn>
            <div className="flex items-center gap-4 ml-auto">
              <Link href="/events">
                <button className=" text-gray-300 font-bold text-sm rounded-lg hover:text-gray-100 hover:cursor-pointer transition duration-300 flex gap-2 items-center justify-center">
                  <Telescope className="lg:h-4 lg:w-4 h-5 w-5" />
                  <span className="lg:block hidden">Discover</span>
                </button>
              </Link>

              <Link href="">
                <button className=" text-gray-300 font-bold text-sm rounded-lg hover:text-gray-100 hover:cursor-pointer transition duration-300 flex gap-2 items-center justify-center">
                  <Ticket className="lg:h-4 lg:w-4 h-5 w-5" />
                  <span className="lg:block hidden">My Events</span>
                </button>
              </Link>

              <Link href="">
                <button className=" text-gray-300 font-bold text-sm rounded-lg hover:text-gray-100 hover:cursor-pointer transition duration-300 flex gap-2 items-center justify-center">
                  <Store className="lg:h-4 lg:w-4 h-5 w-5" />
                  <span className="lg:block hidden">Marketplace</span>
                </button>
              </Link>
              {/* notification bar */}
              <div>
                <NotificationBar />
              </div>
              <UserButton />
            </div>
          </SignedIn>

          <SignedOut>
            <div className="flex gap-4 lg:gap-8 items-center">
              <Link href="/events">
                <button
                  onClick={onViewEvents}
                  className="text-gray-300 font-bold lg:text-md text-sm rounded-lg hover:text-gray-100 hover:cursor-pointer transition duration-300 flex gap-2 items-center justify-center"
                >
                  View Events
                  <Telescope className="h-4 w-4 text-grau-400" />
                </button>
              </Link>
              <SignInButton mode="modal">
                <button className=" text-gray-300 font-bold px-2 py-1 lg:text-md text-sm rounded-lg hover:bg-gray-200 hover:cursor-pointer hover:text-gray-800 transition duration-300 border border-gray-400">
                  Sign In
                </button>
              </SignInButton>
            </div>
          </SignedOut>
        </div>
      </div>
    </div>
  );
}

export default TopBar;
