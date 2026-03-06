"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import AnimatedText from "./AnimatedText";

gsap.registerPlugin(ScrollTrigger);

const features = [
    {
        icon: "🔗",
        title: "Jira Integration",
        desc: "OAuth 2.0 connection with full project & ticket import. Stay in sync automatically every 15 minutes.",
        gradient: "from-[#6e56cf] to-[#8b6fe8]",
    },
    {
        icon: "🧠",
        title: "AI Health Scoring",
        desc: "Every ticket is scored on description quality, assignee clarity, and time estimates — instantly.",
        gradient: "from-[#7c5cbf] to-[#9d7fea]",
    },
    {
        icon: "⚡",
        title: "Sprint Risk Analysis",
        desc: "Claude Haiku + Sonnet analyses your board and surfaces blocked or at-risk issues before they escalate.",
        gradient: "from-[#9d7fea] to-[#c4b0ff]",
    },
    {
        icon: "📝",
        title: "Stakeholder Updates",
        desc: "One-click AI-drafted status update for your whole sprint. Professional, concise, and ready to send.",
        gradient: "from-[#6e56cf] to-[#9d7fea]",
    },
    {
        icon: "✍️",
        title: "Ticket Rewriter",
        desc: "Rewrite any ticket to be clearer, more actionable, and better estimated with one click.",
        gradient: "from-[#8b6fe8] to-[#c4b0ff]",
    },
    {
        icon: "🔍",
        title: "Semantic Search",
        desc: "Voyage AI embeddings on every ticket for context-aware AI responses and intelligent search.",
        gradient: "from-[#9d7fea] to-[#6e56cf]",
    },
];

const steps = [
    { num: "01", title: "Connect Jira", desc: "OAuth 2.0 in one click. We import all your projects and tickets instantly." },
    { num: "02", title: "AI Analysis Runs", desc: "Claude scans every ticket, scores health, and identifies sprint risks automatically." },
    { num: "03", title: "Surface Insights", desc: "Blocked tasks, missing estimates, unclear descriptions — all flagged on your dashboard." },
    { num: "04", title: "Take Action", desc: "Rewrite tickets, draft stakeholder updates, and resolve issues — all inside one tool." },
];

/* ─── Tilt Card ───────────────────────────────────────────────────── */
function TiltCard({ feature, index }: { feature: typeof features[0]; index: number }) {
    const cardRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const el = cardRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
        const y = -((e.clientY - rect.top) / rect.height - 0.5) * 20;
        el.style.transform = `perspective(600px) rotateX(${y}deg) rotateY(${x}deg) scale(1.03)`;
    };

    const handleMouseLeave = () => {
        const el = cardRef.current;
        if (!el) return;
        el.style.transform = "perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)";
    };

    return (
        <div
            ref={cardRef}
            className="feature-card relative rounded-2xl p-6 border border-[#2a2d35] bg-[#1c1f26] overflow-hidden cursor-default transition-all duration-300 ease-out"
            style={{ transitionProperty: "transform, box-shadow" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Gradient top accent */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${feature.gradient}`} />
            {/* Glow blob */}
            <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${feature.gradient} opacity-10 blur-2xl`} />

            <div className="text-3xl mb-4">{feature.icon}</div>
            <h3 className="text-white font-semibold text-base mb-2">{feature.title}</h3>
            <p className="text-[#8b8f9a] text-sm leading-relaxed">{feature.desc}</p>
        </div>
    );
}

/* ─── Main Export ────────────────────────────────────────────────── */
export default function ScrollSections({ isSignedIn }: { isSignedIn: boolean }) {
    const featuresRef = useRef<HTMLElement>(null);
    const stepsRef = useRef<HTMLElement>(null);
    const ctaRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Feature cards stagger in
            gsap.fromTo(
                ".feature-card",
                { opacity: 0, y: 60, scale: 0.94 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.7,
                    stagger: 0.1,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: featuresRef.current,
                        start: "top 80%",
                        toggleActions: "play none none none",
                    },
                }
            );

            // Steps animate in sequentially
            gsap.fromTo(
                ".step-item",
                { opacity: 0, x: -40 },
                {
                    opacity: 1,
                    x: 0,
                    duration: 0.65,
                    stagger: 0.15,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: stepsRef.current,
                        start: "top 75%",
                        toggleActions: "play none none none",
                    },
                }
            );

            // CTA fade up
            gsap.fromTo(
                ".cta-content",
                { opacity: 0, y: 40 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.8,
                    ease: "power2.out",
                    scrollTrigger: {
                        trigger: ctaRef.current,
                        start: "top 80%",
                        toggleActions: "play none none none",
                    },
                }
            );

            // Section headings animate in
            gsap.utils.toArray<HTMLElement>(".section-heading").forEach((el) => {
                gsap.fromTo(
                    el,
                    { opacity: 0, y: 30 },
                    {
                        opacity: 1,
                        y: 0,
                        duration: 0.7,
                        ease: "power2.out",
                        scrollTrigger: {
                            trigger: el,
                            start: "top 85%",
                            toggleActions: "play none none none",
                        },
                    }
                );
            });
        });

        return () => ctx.revert();
    }, []);

    return (
        <>
            {/* ─── Features Section ─────────────────────────────────────────── */}
            <section
                ref={featuresRef}
                id="features"
                className="relative py-28 px-6"
                style={{ background: "linear-gradient(180deg, #0f1117 0%, #12141c 100%)" }}
            >
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16 section-heading" style={{ opacity: 0 }}>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#2a2d35] bg-[#1c1f26] text-[#9d7fea] text-xs font-medium mb-6 tracking-widest uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#9d7fea] animate-pulse" />
                            Everything You Need
                        </div>
                        <h2 className="text-white text-3xl md:text-4xl font-bold mb-4">
                            Your AI-powered PM stack,{" "}
                            <span className="bg-gradient-to-r from-[#9d7fea] to-[#c4b0ff] bg-clip-text text-transparent">
                                unified
                            </span>
                        </h2>
                        <p className="text-[#8b8f9a] max-w-xl mx-auto text-base leading-relaxed">
                            Stop switching between tools. Pocket PM brings sprint intelligence, stakeholder communication, and Jira management into one AI-first workspace.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {features.map((f, i) => (
                            <TiltCard key={i} feature={f} index={i} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── How It Works ─────────────────────────────────────────────── */}
            <section
                ref={stepsRef}
                id="how-it-works"
                className="relative py-28 px-6 overflow-hidden"
                style={{ background: "#0f1117" }}
            >
                {/* Background grid */}
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `linear-gradient(#2a2d35 1px, transparent 1px), linear-gradient(90deg, #2a2d35 1px, transparent 1px)`,
                        backgroundSize: "60px 60px",
                    }}
                />
                {/* Radial gradient overlay */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(110,86,207,0.07) 0%, transparent 70%)",
                    }}
                />

                <div className="relative max-w-4xl mx-auto">
                    <div className="text-center mb-16 section-heading" style={{ opacity: 0 }}>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#2a2d35] bg-[#1c1f26] text-[#9d7fea] text-xs font-medium mb-6 tracking-widest uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#9d7fea] animate-pulse" />
                            Simple Setup
                        </div>
                        <h2 className="text-white text-3xl md:text-4xl font-bold mb-4">
                            Up and running in{" "}
                            <span className="bg-gradient-to-r from-[#9d7fea] to-[#c4b0ff] bg-clip-text text-transparent">
                                minutes
                            </span>
                        </h2>
                    </div>

                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-8 top-8 bottom-8 w-px bg-gradient-to-b from-[#6e56cf] via-[#9d7fea] to-transparent hidden md:block" />

                        <div className="space-y-6">
                            {steps.map((step, i) => (
                                <div
                                    key={i}
                                    className="step-item flex gap-6 items-start"
                                    style={{ opacity: 0 }}
                                >
                                    <div className="flex-shrink-0 w-16 h-16 rounded-2xl border border-[#2a2d35] bg-[#1c1f26] flex items-center justify-center relative">
                                        <span className="text-[#9d7fea] font-mono font-bold text-xs">{step.num}</span>
                                        {/* Glowing dot connector */}
                                        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#9d7fea] hidden md:block" />
                                    </div>
                                    <div className="flex-1 rounded-2xl border border-[#2a2d35] bg-[#1c1f26] p-5 hover:border-[#6e56cf] transition-colors duration-300 group">
                                        <h3 className="text-white font-semibold text-base mb-1 group-hover:text-[#9d7fea] transition-colors">
                                            {step.title}
                                        </h3>
                                        <p className="text-[#8b8f9a] text-sm leading-relaxed">{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── CTA Section ──────────────────────────────────────────────── */}
            <section
                ref={ctaRef}
                className="relative py-28 px-6 overflow-hidden"
                style={{
                    background: "linear-gradient(180deg, #12141c 0%, #0f1117 100%)",
                }}
            >
                {/* Animated border glow */}
                <div
                    className="absolute inset-8 rounded-3xl border border-[#6e56cf] opacity-30"
                    style={{
                        boxShadow: "0 0 80px rgba(110,86,207,0.15), inset 0 0 80px rgba(110,86,207,0.05)",
                    }}
                />
                {/* Radial glow center */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: "radial-gradient(ellipse 50% 60% at 50% 50%, rgba(110,86,207,0.12) 0%, transparent 70%)",
                    }}
                />

                <div className="relative cta-content max-w-3xl mx-auto text-center" style={{ opacity: 0 }}>
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#2a2d35] bg-[#1c1f26] text-[#9d7fea] text-xs font-medium mb-8 tracking-widest uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#3dd68c] animate-pulse" />
                        Free to Start
                    </div>

                    <h2 className="text-white text-4xl md:text-5xl font-bold mb-6 leading-tight">
                        Ready to run{" "}
                        <span className="bg-gradient-to-r from-[#9d7fea] via-[#c4b0ff] to-[#6e56cf] bg-clip-text text-transparent">
                            smarter sprints?
                        </span>
                    </h2>
                    <p className="text-[#8b8f9a] text-base leading-relaxed mb-10 max-w-xl mx-auto">
                        Connect your Jira workspace and let AI handle the analysis, updates, and ticket cleanup — so you can focus on shipping.
                    </p>

                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        {isSignedIn ? (
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#6e56cf] to-[#9d7fea] text-white font-semibold text-base hover:shadow-[0_0_40px_rgba(110,86,207,0.5)] transition-all duration-300 hover:scale-105"
                            >
                                Open Dashboard →
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/sign-up"
                                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-[#6e56cf] to-[#9d7fea] text-white font-semibold text-base hover:shadow-[0_0_40px_rgba(110,86,207,0.5)] transition-all duration-300 hover:scale-105"
                                >
                                    Start for free →
                                </Link>
                                <Link
                                    href="/sign-in"
                                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-[#2a2d35] text-[#8b8f9a] hover:text-white hover:border-[#6e56cf] font-medium text-base transition-all duration-300"
                                >
                                    Sign in
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ─── Footer ───────────────────────────────────────────────────── */}
            <footer className="relative py-8 px-6 border-t border-[#1c1f26]" style={{ background: "#0d0f15" }}>
                <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#6e56cf] to-[#9d7fea] flex items-center justify-center">
                            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                                <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" stroke="white" strokeWidth="2" fill="none" />
                                <circle cx="8" cy="8" r="2" fill="white" />
                            </svg>
                        </div>
                        <span className="text-[#8b8f9a] text-xs">Pocket PM · AI-Native Project Management</span>
                    </div>
                    <span className="text-[#2a2d35] text-xs">Built with Next.js · Convex · Clerk · Claude</span>
                </div>
            </footer>
        </>
    );
}
