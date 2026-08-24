"use client";

import React, { useEffect, useRef } from "react";
import anime from "animejs";

export function MonochromeBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Subtle floating particles using Anime.js
    const particles = containerRef.current.querySelectorAll(".anime-node");
    
    anime({
      targets: particles,
      translateX: () => anime.random(-35, 35),
      translateY: () => anime.random(-35, 35),
      scale: () => [anime.random(0.8, 1.2), anime.random(0.9, 1.4)],
      opacity: () => [anime.random(0.15, 0.45), anime.random(0.2, 0.6)],
      easing: "easeInOutQuad",
      duration: () => anime.random(6000, 12000),
      delay: () => anime.random(0, 2000),
      direction: "alternate",
      loop: true,
    });

    if (glowRef.current) {
      anime({
        targets: glowRef.current,
        opacity: [0.35, 0.65],
        scale: [0.95, 1.05],
        easing: "easeInOutSine",
        duration: 8000,
        direction: "alternate",
        loop: true,
      });
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Subtle top spotlight glow */}
      <div
        ref={glowRef}
        className="absolute -top-[250px] left-1/2 -translate-x-1/2 w-[900px] h-[550px] rounded-full bg-radial-gradient blur-[90px] opacity-40"
      />

      {/* Grid texture */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60" />

      {/* Vignette mask */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0c0d10_75%)]" />

      {/* Anime.js animated subtle node cluster */}
      {Array.from({ length: 28 }).map((_, i) => {
        const top = `${(i * 37) % 95}%`;
        const left = `${(i * 43) % 98}%`;
        const size = (i % 3) + 2;
        return (
          <div
            key={i}
            className="anime-node absolute rounded-full bg-[#d0d6e0] shadow-[0_0_8px_rgba(255,255,255,0.2)]"
            style={{
              top,
              left,
              width: `${size}px`,
              height: `${size}px`,
              opacity: 0.25,
            }}
          />
        );
      })}
    </div>
  );
}
