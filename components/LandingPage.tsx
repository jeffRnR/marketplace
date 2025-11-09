"use client";

import { useSession } from "next-auth/react";
import React, { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SignInModal from "@/components/SignInModal";

function LandingPage() {
  const { data: session, status } = useSession();
  const [showSignIn, setShowSignIn] = useState(false);
  const router = useRouter();

  const handleCreateEvent = () => {
    if (status !== "authenticated") {
      // Show sign-in modal if not logged in
      setShowSignIn(true);
    } else {
      // Use Next.js router instead of window.location
      router.push("/events/create");
    }
  };

  const isAuthenticated = status === "authenticated";
  const isLoading = status === "loading";

  return (
    <div className="w-full min-h-screen flex flex-col lg:flex-row items-center justify-center p-4 gap-8 my-10">
      {/* Left: Text */}
      <div className="relative flex flex-col gap-4 lg:max-w-[30%] text-center lg:text-left">
        <h1 className="text-[4rem] font-bold bg-gradient-to-r from-green-600 via-purple-400 to-purple-600 bg-clip-text text-transparent">
          Noizy Hub
        </h1>

        <p className="text-gray-300 text-lg">
          This is a vibrant, multi-vendor e-ticketing platform that connects
          event brands with their audience. Create, share, and discover
          unforgettable experiences.
        </p>

        {/* Actions */}
        <div className="flex gap-4 justify-center lg:justify-start items-center mt-4">
          {isLoading ? (
            <div className="bg-gray-200 text-gray-800 rounded-lg px-4 py-2 text-md font-bold border border-gray-400 animate-pulse">
              Loading...
            </div>
          ) : (
            <Link href="/events">
              <button className="bg-gray-200 text-gray-800 rounded-lg px-4 py-2 text-md font-bold border border-gray-400 hover:bg-transparent hover:text-gray-300 hover:cursor-pointer transition duration-300 flex justify-center gap-2 items-center">
                <span>View Events</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </Link>            
          )}
        </div>
      </div>

      {/* Right: Video */}
      <div className="flex items-center justify-center">
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

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </div>
  );
}

export default LandingPage;
