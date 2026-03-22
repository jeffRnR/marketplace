import Link from "next/link";
import React from "react";
import Image from "next/image";
import logo from "@/images/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLinktree, faInstagram, faTiktok, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t-2 border-gray-400">

      {/* ── Main footer body ── */}
      <div className="mx-auto w-full lg:w-[70%] px-4 pt-10 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">

          {/* ── Col 1: Brand ── */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <Image src={logo} alt="Noizy Hub" className="w-24 lg:w-28" />
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed mb-5">
              Kenya&apos;s home for live events, ticketing, and a marketplace
              connecting vendors with the right audience.
            </p>
            {/* Social icons */}
            <div className="flex items-center gap-3">
              <Link href="https://linktr.ee/noizynightz" target="_blank" aria-label="Linktree"
                className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center
                           justify-center text-gray-400 hover:text-gray-100 hover:border-gray-500 transition duration-200">
                <FontAwesomeIcon icon={faLinktree} className="w-3.5 h-3.5" />
              </Link>
              <Link href="https://instagram.com/noizynightz" target="_blank" aria-label="Instagram"
                className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center
                           justify-center text-gray-400 hover:text-pink-400 hover:border-pink-700/50 transition duration-200">
                <FontAwesomeIcon icon={faInstagram} className="w-3.5 h-3.5" />
              </Link>
              <Link href="https://tiktok.com/@noizynightz" target="_blank" aria-label="TikTok"
                className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center
                           justify-center text-gray-400 hover:text-gray-100 hover:border-gray-500 transition duration-200">
                <FontAwesomeIcon icon={faTiktok} className="w-3.5 h-3.5" />
              </Link>
              <Link href="https://x.com/noizynightz" target="_blank" aria-label="X / Twitter"
                className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center
                           justify-center text-gray-400 hover:text-gray-100 hover:border-gray-500 transition duration-200">
                <FontAwesomeIcon icon={faXTwitter} className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* ── Col 2: Explore ── */}
          <div>
            <p className="text-gray-300 font-semibold text-sm mb-4 uppercase tracking-widest">Explore</p>
            <ul className="space-y-2.5">
              {[
                { label: "Discover Events",  href: "/events" },
                { label: "Create an Event",  href: "/events/create" },
                { label: "My Events",        href: "/my-events" },
                { label: "Buy Tickets",      href: "/events/all" },
                { label: "RSVP",             href: "/events" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-gray-500 text-sm hover:text-gray-300 transition duration-200">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Col 3: Marketplace ── */}
          <div>
            <p className="text-gray-300 font-semibold text-sm mb-4 uppercase tracking-widest">Noizy Marketplace</p>
            <ul className="space-y-2.5">
              {[
                { label: "Browse Vendors",    href: "/marketplace" },
                { label: "Vendor Dashboard",  href: "/marketplace/dashboard" },
                { label: "Create a Profile",  href: "/marketplace/create-profile" },
                { label: "Apply for a Slot",  href: "/marketplace" },
                { label: "Messages",          href: "/messages" },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-gray-500 text-sm hover:text-gray-300 transition duration-200">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Col 4: Contact ── */}
          <div>
            <p className="text-gray-300 font-semibold text-sm mb-4 uppercase tracking-widest">Get in Touch</p>
            <ul className="space-y-3">
              <li>
                <a href="mailto:noizyhub@gmail.com"
                  className="flex items-center gap-2.5 text-gray-500 text-sm hover:text-gray-400 transition duration-200 group">
                  <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0 group-hover:text-gray-400" />
                  noizyhub@gmail.com
                </a>
              </li>
              <li>
                <a href="tel:+254742422990"
                  className="flex items-center gap-2.5 text-gray-500 text-sm hover:text-gray-400 transition duration-200 group">
                  <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0 group-hover:text-gray-400" />
                  0742 422 990
                </a>
              </li>
              <li>
                <a href="https://wa.me/254742422990" target="_blank"
                  className="flex items-center gap-2.5 text-gray-500 text-sm hover:text-gray-400 transition duration-200 group">
                  <MessageCircle className="w-3.5 h-3.5 text-gray-500 shrink-0 group-hover:text-gray-400" />
                  WhatsApp Us
                </a>
              </li>
              <li>
                <div className="flex items-start gap-2.5 text-gray-500 text-sm">
                  <MapPin className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                  Nairobi, Kenya
                </div>
              </li>
            </ul>
          </div>

        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-gray-800 pt-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap justify-center sm:justify-start">
              <Link href="/terms"    className="hover:text-gray-300 transition duration-200">Terms</Link>
              <span className="text-gray-700">·</span>
              <Link href="/privacy"  className="hover:text-gray-300 transition duration-200">Privacy</Link>
              <span className="text-gray-700">·</span>
              <Link href="/security" className="hover:text-gray-300 transition duration-200">Security</Link>
              <span className="text-gray-700">·</span>
              <Link href="#"         className="hover:text-gray-300 transition duration-200">Help</Link>
            </div>
            <p className="text-gray-600 text-xs shrink-0">
              © {currentYear} Noizy Hub Kenya. All rights reserved.
            </p>
          </div>
        </div>

      </div>
    </footer>
  );
}

export default Footer;