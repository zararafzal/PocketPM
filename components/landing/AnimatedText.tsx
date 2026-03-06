"use client";
import { useEffect, useRef } from "react";
import gsap from "gsap";

interface AnimatedTextProps {
    text: string;
    className?: string;
    delay?: number;
    tag?: "h1" | "h2" | "h3" | "p" | "span";
    stagger?: number;
}

export default function AnimatedText({
    text,
    className = "",
    delay = 0,
    tag: Tag = "h1",
    stagger = 0.06,
}: AnimatedTextProps) {
    const containerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const spans = el.querySelectorAll(".word");
        gsap.fromTo(
            spans,
            { opacity: 0, y: 40, rotateX: -30 },
            {
                opacity: 1,
                y: 0,
                rotateX: 0,
                duration: 0.8,
                stagger,
                delay,
                ease: "power3.out",
            }
        );
    }, [delay, stagger]);

    const words = text.split(" ");

    return (
        <Tag
            ref={containerRef as React.RefObject<HTMLHeadingElement>}
            className={className}
            style={{ perspective: "600px" }}
        >
            {words.map((word, i) => (
                <span
                    key={i}
                    className="word"
                    style={{ display: "inline-block", whiteSpace: "pre", opacity: 0 }}
                >
                    {word}
                    {i < words.length - 1 ? " " : ""}
                </span>
            ))}
        </Tag>
    );
}
