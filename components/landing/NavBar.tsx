"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import gsap from "gsap";

export default function NavBar() {
    const { isSignedIn } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => {
        // Animate in on mount
        gsap.fromTo(
            navRef.current,
            { opacity: 0, y: -20 },
            { opacity: 1, y: 0, duration: 0.8, delay: 0.3, ease: "power2.out" }
        );

        const handleScroll = () => {
            setScrolled(window.scrollY > 60);
        };
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav
            ref={navRef}
            style={{ opacity: 0 }}
            className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 transition-all duration-500 ${scrolled
                    ? "bg-[rgba(15,17,23,0.85)] backdrop-blur-xl border-b border-[rgba(110,86,207,0.2)] shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
                    : "bg-transparent"
                }`}
        >
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
                <div className="relative w-8 h-8">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#6e56cf] to-[#9d7fea] blur-sm opacity-70 group-hover:opacity-100 transition-opacity" />
                    <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[#6e56cf] to-[#9d7fea] flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" stroke="white" strokeWidth="1.5" fill="none" />
                            <circle cx="8" cy="8" r="2" fill="white" />
                        </svg>
                    </div>
                </div>
                <span className="text-white font-semibold text-base tracking-tight">
                    Pocket <span className="text-[#9d7fea]">PM</span>
                </span>
            </Link>

            {/* CTA */}
            <div className="flex items-center gap-3">
                {isSignedIn ? (
                    <Link
                        href="/dashboard"
                        className="px-5 py-2 rounded-full bg-gradient-to-r from-[#6e56cf] to-[#9d7fea] text-white text-sm font-medium hover:shadow-[0_0_20px_rgba(110,86,207,0.5)] transition-all duration-300 hover:scale-105"
                    >
                        Go to Dashboard →
                    </Link>
                ) : (
                    <>
                        <Link
                            href="/sign-in"
                            className="text-[#8b8f9a] hover:text-white text-sm font-medium transition-colors duration-200"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/sign-up"
                            className="px-5 py-2 rounded-full bg-gradient-to-r from-[#6e56cf] to-[#9d7fea] text-white text-sm font-medium hover:shadow-[0_0_20px_rgba(110,86,207,0.5)] transition-all duration-300 hover:scale-105"
                        >
                            Get Started
                        </Link>
                    </>
                )}
            </div>
        </nav>
    );
}
