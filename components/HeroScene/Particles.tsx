'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Drifting ambient particles spread across full scene width ───────────────
export function Particles() {
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const COUNT  = 200;

  const { positions, seeds } = useMemo(() => {
    const pos  = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT * 3); // random drift seeds per axis
    for (let i = 0; i < COUNT; i++) {
      // Spread across full hero: x from -11 to +11
      pos[i * 3]     = (Math.random() - 0.5) * 22;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 7;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
      seed[i * 3]    = Math.random() * Math.PI * 2;
      seed[i * 3 + 1]= Math.random() * Math.PI * 2;
      seed[i * 3 + 2]= Math.random() * Math.PI * 2;
    }
    return { positions: pos, seeds: seed };
  }, []);

  // Keep original positions for orbit math
  const orig = useMemo(() => new Float32Array(positions), [positions]);

  useFrame((state) => {
    if (!geoRef.current) return;
    const t   = state.clock.elapsedTime;
    const arr = geoRef.current.attributes.position.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const speed = 0.25 + (seeds[i * 3] % 0.5);
      arr[i * 3]     = orig[i * 3]     + Math.sin(t * speed + seeds[i * 3])     * 0.4;
      arr[i * 3 + 1] = orig[i * 3 + 1] + Math.cos(t * speed + seeds[i * 3 + 1]) * 0.5;
      arr[i * 3 + 2] = orig[i * 3 + 2] + Math.sin(t * speed + seeds[i * 3 + 2]) * 0.3;
    }
    geoRef.current.attributes.position.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#60a5fa"
        size={0.045}
        transparent
        opacity={0.75}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─── Scientific network: nodes + connecting lines across full scene ─────────
export function ScientificNetwork() {
  const { nodePos, linePos } = useMemo(() => {
    // 24 nodes scattered across full hero width
    const nodes: THREE.Vector3[] = Array.from({ length: 24 }, () =>
      new THREE.Vector3(
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 7,
        (Math.random() - 0.5) * 6 - 1,
      )
    );

    const lines: number[] = [];
    const maxD = 5.5;
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++)
        if (nodes[i].distanceTo(nodes[j]) < maxD)
          lines.push(...nodes[i].toArray(), ...nodes[j].toArray());

    return {
      nodePos: new Float32Array(nodes.flatMap(n => n.toArray())),
      linePos: new Float32Array(lines),
    };
  }, []);

  return (
    <group>
      {/* Thin glowing network lines */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePos, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.10}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* Node glowing dots */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nodePos, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#93c5fd"
          size={0.07}
          transparent
          opacity={0.6}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
