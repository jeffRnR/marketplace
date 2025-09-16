import Link from "next/link";
import React from "react";
import Image from "next/image";
import logo from "@/images/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLinktree } from "@fortawesome/free-brands-svg-icons";

function Footer() {
  return (
    <footer className="w-full ">
      <div className="mx-auto mb-4 border-t border-gray-400/50 shadow-md w-full lg:w-[70%] px-4">
        {/* Top row: Logo + Links + Social */}
        <div className="flex flex-row items-center justify-between gap-4 mt-4">
          {/* Logo + nav links */}
          <div className="flex items-center gap-4">
            <Link href="/" className="font-bold shrink-0">
              <Image src={logo} alt="logo" className="w-20 lg:w-28" />
            </Link>
            <Link
              href="#"
              className="text-gray-300 text-md transition duration-300 hover:text-gray-100"
            >
              Discover
            </Link>
            <Link
              href="#"
              className="text-gray-300 text-md transition duration-300 hover:text-gray-100"
            >
              Help
            </Link>
          </div>

          {/* Social links */}
          <div className="flex gap-2 items-center text-gray-300 hover:text-gray-100 transition duration-300">
            <Link href="https://linktr.ee/noizynightz" target="_blank">
              <div className="flex items-center gap-2">
                <span>Linktree</span>
                <FontAwesomeIcon icon={faLinktree} className="w-5 h-5" />
              </div>
            </Link>
          </div>
        </div>

        {/* Bottom row: Legal */}
        <div className="relative flex items-center justify-between w-full py-2 lg:py-4">
          {/* Left side: Terms */}
          <div className="flex items-center lg:gap-4 gap-2 text-md text-gray-400">
            <span className="hover:text-gray-300 cursor-pointer">Terms</span>
            <span className="hover:text-gray-300 cursor-pointer">Privacy</span>
            <span className="hover:text-gray-300 cursor-pointer">Security</span>
          </div>          
        </div>
      </div>
    </footer>
  );
}

export default Footer;
