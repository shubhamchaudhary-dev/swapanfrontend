'use client';

/**
 * ScientificWave — full-hero-width animated glowing dot wave
 *
 * Spans from x = -12 to x = +12 so it covers the ENTIRE hero,
 * flowing behind both the text on the left and the papers on the right.
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vert = /* glsl */ `
  uniform float uTime;
  varying float vElevation;
  varying float vX;

  void main() {
    vec3 pos = position;

    // Primary wave — low frequency, large amplitude
    float e  = sin(pos.x * 0.38 + uTime * 0.22) * 1.60;
    // Secondary crossing wave
         e += cos(pos.z * 0.44 - uTime * 0.18) * 0.90;
    // Fine ripple on top
         e += sin((pos.x * 0.25 + pos.z * 0.20) + uTime * 0.14) * 1.20;
    // Long slow undulation
         e += cos(pos.x * 0.10 - uTime * 0.10) * 0.70;

    pos.y = e;
    vElevation = e;
    vX = pos.x;   // for left→right alpha fade

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = clamp(9.0 / -mv.z, 1.0, 5.0);
    gl_Position  = projectionMatrix * mv;
  }
`;

const frag = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uWidthHalf; // = half width of the grid
  varying float vElevation;
  varying float vX;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float alpha = (0.5 - d) * 2.0;

    // Slightly fade at far left and far right edges for a natural feel
    float edgeFade = 1.0 - smoothstep(uWidthHalf * 0.7, uWidthHalf, abs(vX));
    alpha *= 0.55 * edgeFade;

    float t = clamp((vElevation + 2.5) / 5.0, 0.0, 1.0);
    vec3 col = mix(uColorA, uColorB, t);
    gl_FragColor = vec4(col, alpha);
  }
`;

export default function ScientificWave() {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  // 80 columns × 55 rows = 4 400 points across the full hero width
  const COLS = 80, ROWS = 55;
  const W = 24, D = 14;          // scene units wide × deep
  const count = COLS * ROWS;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = r * COLS + c;
        arr[i * 3]     = (c / (COLS - 1) - 0.5) * W;
        arr[i * 3 + 1] = 0;
        arr[i * 3 + 2] = (r / (ROWS - 1) - 0.5) * D;
      }
    }
    return arr;
  }, []);

  const uniforms = useMemo(() => ({
    uTime:      { value: 0 },
    uColorA:    { value: new THREE.Color('#93c5fd') },   // light blue trough
    uColorB:    { value: new THREE.Color('#2563eb') },   // vivid blue crest
    uWidthHalf: { value: W / 2 },
  }), []);

  useFrame((s) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = s.clock.elapsedTime * 0.22;
  });

  return (
    /* Positioned behind everything: z=-4, y=-1.5 */
    <group position={[0, -1.5, -4]} rotation={[0.05, 0, 0]}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
