"use client";
import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import NavBar from "./NavBar";
import AnimatedText from "./AnimatedText";
import ScrollSections from "./ScrollSections";
import HeroScene from "./HeroScene";

gsap.registerPlugin(ScrollTrigger);

export default function LandingPage() {
    const { isSignedIn } = useAuth();
    const heroRef = useRef<HTMLDivElement>(null);
    const subRef = useRef<HTMLParagraphElement>(null);
    const ctaRef = useRef<HTMLDivElement>(null);
    const badgeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            const tl = gsap.timeline({ delay: 0.4 });

            // Badge
            tl.fromTo(
                badgeRef.current,
                { opacity: 0, y: -10, scale: 0.9 },
                { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.5)" }
            );

            // Sub-headline
            tl.fromTo(
                subRef.current,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" },
                "-=0.1"
            );

            // CTA buttons
            tl.fromTo(
                ctaRef.current,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
                "-=0.3"
            );

            // Scroll-based parallax on hero text
            gsap.to(heroRef.current, {
                y: -80,
                ease: "none",
                scrollTrigger: {
                    trigger: heroRef.current,
                    start: "top top",
                    end: "bottom top",
                    scrub: 1.5,
                },
            });
        });

        return () => ctx.revert();
    }, []);

    return (
        <div className="relative min-h-screen" style={{ background: "#0f1117" }}>
            <NavBar />

            {/* ─── Hero ─────────────────────────────────────────────────────── */}
            <section
                className="relative flex items-center justify-center overflow-hidden"
                style={{ height: "100vh", minHeight: "640px" }}
            >
                {/* Three.js Canvas Background */}
                <HeroScene />

                {/* Vignette overlay */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, rgba(15,17,23,0.7) 100%)",
                    }}
                />
                {/* Bottom fade to next section */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
                    style={{
                        background: "linear-gradient(to bottom, transparent, #0f1117)",
                    }}
                />

                {/* Hero Content */}
                <div
                    ref={heroRef}
                    className="relative z-10 text-center px-6 max-w-4xl mx-auto"
                >
                    {/* Badge */}
                    <div
                        ref={badgeRef}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#2a2d35] bg-[rgba(28,31,38,0.8)] backdrop-blur-sm text-[#9d7fea] text-xs font-medium mb-8 tracking-widest uppercase"
                        style={{ opacity: 0 }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#9d7fea] animate-pulse" />
                        AI-Native Project Management
                    </div>

                    {/* Main headline */}
                    <AnimatedText
                        text="Your AI Copilot for Smarter Sprints"
                        tag="h1"
                        delay={0.7}
                        stagger={0.07}
                        className="text-white font-bold leading-tight mb-6"
                    // inline style for font size since tailwind doesn't include the exact size
                    />
                    <style>{`.landing-h1 { font-size: clamp(2.4rem, 6vw, 4.2rem); }`}</style>

                    {/* Override h1 size via className trick */}
                    <p
                        ref={subRef}
                        className="text-[#8b8f9a] text-lg leading-relaxed max-w-2xl mx-auto mb-10"
                        style={{ opacity: 0 }}
                    >
                        Connect Jira · Let Claude analyse your board · Surface blocked tickets, draft stakeholder updates, and rewrite unclear stories — all before you ask.
                    </p>

                    {/* CTAs */}
                    <div
                        ref={ctaRef}
                        className="flex items-center justify-center gap-4 flex-wrap"
                        style={{ opacity: 0 }}
                    >
                        {isSignedIn ? (
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#6e56cf] to-[#9d7fea] text-white font-semibold text-base hover:shadow-[0_0_40px_rgba(110,86,207,0.6)] transition-all duration-300 hover:scale-105"
                            >
                                Open Dashboard →
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/sign-up"
                                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#6e56cf] to-[#9d7fea] text-white font-semibold text-base hover:shadow-[0_0_40px_rgba(110,86,207,0.6)] transition-all duration-300 hover:scale-105"
                                >
                                    Get started free →
                                </Link>
                                <Link
                                    href="/sign-in"
                                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-[#2a2d35] bg-[rgba(28,31,38,0.7)] backdrop-blur-sm text-[#8b8f9a] hover:text-white hover:border-[#6e56cf] font-medium text-base transition-all duration-300"
                                >
                                    Sign in
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Scroll hint */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-40">
                        <span className="text-[#8b8f9a] text-xs tracking-widest uppercase">Scroll</span>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 3v10M4 9l4 4 4-4" stroke="#8b8f9a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                </div>
            </section>

            {/* ─── Scroll Sections ──────────────────────────────────────────── */}
            <ScrollSections isSignedIn={!!isSignedIn} />
        </div>
    );
}
