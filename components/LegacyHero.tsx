'use client';

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import Image from 'next/image';

export default function HeroAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroWrapperRef = useRef<HTMLDivElement>(null);

  // Layers for parallax and independent animation
  const waveRef = useRef<HTMLDivElement>(null);
  const papersRef = useRef<HTMLDivElement>(null);
  const moleculeRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  // To hold generated particles
  const particlesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Create a GSAP Context for easy cleanup
    const ctx = gsap.context(() => {

      // 8. Entrance Animation
      gsap.fromTo(containerRef.current,
        { opacity: 0, scale: 0.96, y: 30 },
        { opacity: 1, scale: 1, y: 0, duration: 1.4, ease: "power3.out" }
      );

      if (prefersReducedMotion) return;

      // 1. Floating Hero (Entire Illustration)
      gsap.to(heroWrapperRef.current, {
        y: "-=12",
        rotation: 1,
        duration: 5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      });

      // 2. Mesh Wave (Gentle horizontal drift)
      gsap.to(waveRef.current, {
        x: "+=15",
        duration: 8,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      });

      // 3. Floating Papers
      gsap.to(papersRef.current, {
        y: "-=8",
        rotation: -0.5,
        scale: 1.01,
        duration: 4.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 0.5
      });

      // 4. Molecule Animation (Slow rotation and float)
      gsap.to(moleculeRef.current, {
        rotation: 360,
        duration: 25,
        ease: "none",
        repeat: -1
      });
      gsap.to(moleculeRef.current, {
        y: "-=15",
        x: "+=5",
        duration: 6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      });

      // 5. Glow (Pulsing opacity)
      gsap.to(glowRef.current, {
        opacity: 1,
        duration: 2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1
      });

      // 6. Particle Animation
      const particles = particlesContainerRef.current?.children;
      if (particles) {
        Array.from(particles).forEach((particle) => {
          gsap.to(particle, {
            y: `-=${Math.random() * 40 + 20}`,
            x: `+=${(Math.random() - 0.5) * 40}`,
            opacity: Math.random() * 0.5 + 0.3,
            duration: Math.random() * 3 + 3,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: Math.random() * 2
          });
        });
      }

      // 7. Mouse Parallax
      const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();

        // Calculate mouse position relative to center of container (-1 to 1)
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

        // Apply slight offset to layers based on depth
        gsap.to(papersRef.current, { x: x * -10, y: y * -10, duration: 1, ease: "power2.out" });
        gsap.to(waveRef.current, { x: x * -5, y: y * -5, duration: 1, ease: "power2.out" });
        gsap.to(moleculeRef.current, { x: x * -20, y: y * -20, duration: 1, ease: "power2.out" });
        gsap.to(glowRef.current, { x: x * -15, y: y * -15, duration: 1, ease: "power2.out" });
      };

      window.addEventListener('mousemove', handleMouseMove);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
      };

    }, containerRef); // Scope to container

    return () => ctx.revert(); // Cleanup on unmount
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0"
      style={{ perspective: '1000px' }}
    >
      <div ref={heroWrapperRef} className="relative w-full h-full flex items-center justify-center transform-gpu">

        {/* Synthetic Glow Layer behind everything */}
        <div
          ref={glowRef}
          className="absolute w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, rgba(14,165,233,0) 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            mixBlendMode: 'screen',
          }}
        />

        {/* Base Layer / Wave (Full Image) */}
        <div ref={waveRef} className="absolute inset-0 w-full h-full opacity-90">
          <Image
            src="/images/homee.png"
            alt="Hero Background"
            fill
            className="object-contain object-center opacity-80"
            priority
          />
        </div>

        {/* Papers Layer (Clipped Center) */}
        <div
          ref={papersRef}
          className="absolute inset-0 w-full h-full"
          style={{ clipPath: 'polygon(15% 25%, 85% 25%, 85% 95%, 15% 95%)' }}
        >
          <Image
            src="/images/homee.png"
            alt="Hero Papers"
            fill
            className="object-contain object-center drop-shadow-2xl"
            priority
          />
        </div>

        {/* Molecule Layer (Clipped Top-Right approx) */}
        <div
          ref={moleculeRef}
          className="absolute inset-0 w-full h-full"
          style={{ clipPath: 'circle(15% at 75% 25%)' }}
        >
          <Image
            src="/images/homee.png"
            alt="Hero Molecule"
            fill
            className="object-contain object-center"
            priority
          />
        </div>

        {/* Synthetic Particles */}
        <div ref={particlesContainerRef} className="absolute inset-0 w-full h-full pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-blue-400"
              style={{
                width: Math.random() * 4 + 2 + 'px',
                height: Math.random() * 4 + 2 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                opacity: 0,
                boxShadow: '0 0 8px rgba(96, 165, 250, 0.6)'
              }}
            />
          ))}
        </div>

      </div>
    </div>
  );
}
