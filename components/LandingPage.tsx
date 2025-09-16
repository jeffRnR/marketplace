"use client";

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import React from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

function LandingPage() {
  return (
    <div className="w-full min-h-screen flex flex-col lg:flex-row items-center justify-center p-4 gap-8 my-10">
      {/* Left side: text */}
      <div className="relative flex flex-col gap-4 lg:max-w-[30%] text-center lg:text-left">
        <h1 className="text-[4rem] font-bold bg-gradient-to-r from-green-600 via-purple-400 to-purple-600 bg-clip-text text-transparent">
          Noizy Hub
        </h1>

        <p className="text-gray-300 text-lg">
          This is a vibrant, multi-vendor e-ticketing platform that connects
          event brands with their audience. It features the ultimate marketplace
          for creating, sharing, and discovering unforgettable experiences.
        </p>

        <div className="flex flex-row w-full gap-4 justify-center lg:justify-start items-center">
          <SignedOut>
            <SignInButton mode="modal">
              <button
                className="w-[60%] bg-gray-200 text-gray-800 rounded-lg px-4 py-2 text-md 
        font-bold border border-gray-400 hover:bg-transparent hover:text-gray-300 hover:cursor-pointer
        transition duration-300 flex justify-center gap-2 items-center"
              >
                <span>Create Event</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </SignInButton>
          </SignedOut>
        </div>

        <div className="flex w-full text-center gap-4 justify-center lg:justify-start items-center">
          <SignedIn>
            <Link href="/events">
              <button
                className=" bg-gray-200 text-gray-800 rounded-lg px-4 py-2 text-md 
        font-bold border border-gray-400 hover:bg-transparent hover:text-gray-300 hover:cursor-pointer
        transition duration-300 flex justify-center gap-2 items-center"
              >
                <span>View Events</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </Link>
          </SignedIn>
        </div>
        
      </div>

      {/* Right side: video */}
      <div className="items-center justify-center">
        <video
          className="w-[450px] h-[450px] lg:w-[500px] lg:h-[500px] rounded-full object-cover shadow-lg"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/videos/vid1.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}

export default LandingPage;
