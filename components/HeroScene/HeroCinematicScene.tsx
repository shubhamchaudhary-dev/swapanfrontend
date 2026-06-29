'use client';

/**
 * HeroCinematicScene — one self-contained cinematic hero
 *
 * Layer stack (back → front):
 *  0. Background radial glow (CSS on parent, not Three.js)
 *  1. Background particles (far, tiny, slow)
 *  2. Scientific wave  — GLSL shader, 7000 pts, full hero width
 *  3. Network nodes + connection lines
 *  4. Mid particles
 *  5. Paper stack (hero object)
 *  6. Molecule
 *  7. Foreground particles (near, larger)
 */

import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Environment, Preload, Text } from '@react-three/drei';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// 1. WAVE  — GLSL, 100×70 = 7 000 pts, additive blending
// ─────────────────────────────────────────────────────────────────────────────

const waveVert = /* glsl */`
  uniform float uTime;
  varying float vElevation;
  varying float vX;

  // Simple smooth noise using sin/cos, no external library needed
  float hash(float n) { return fract(sin(n) * 43758.5453123); }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n = i.x + i.y * 57.0;
    return mix(
      mix(hash(n), hash(n+1.0), f.x),
      mix(hash(n+57.0), hash(n+58.0), f.x),
      f.y
    );
  }

  void main() {
    vec3 pos = position;
    vX = pos.x;

    float t = uTime;

    // Layer 1 — long slow swell
    float e  = sin(pos.x * 0.32 + t * 0.20) * 1.80;
    // Layer 2 — medium frequency roll
         e += cos(pos.z * 0.42 - t * 0.17) * 1.10;
    // Layer 3 — diagonal ripple
         e += sin((pos.x * 0.22 + pos.z * 0.18) + t * 0.13) * 1.40;
    // Layer 4 — high-freq micro-detail
         e += noise(vec2(pos.x * 0.60 + t * 0.18, pos.z * 0.55 - t * 0.12)) * 0.70;
    // Layer 5 — very slow global rise/fall
         e += sin(pos.x * 0.09 + t * 0.07) * 0.80;

    pos.y = e;
    vElevation = clamp(e, -3.5, 3.5);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    // Points scale with elevation for extra depth cue
    gl_PointSize = clamp((8.0 + vElevation * 0.8) / -mv.z, 0.8, 6.0);
    gl_Position  = projectionMatrix * mv;
  }
`;

const waveFrag = /* glsl */`
  uniform vec3 uColorLow;
  uniform vec3 uColorMid;
  uniform vec3 uColorHigh;
  uniform float uHalfW;
  varying float vElevation;
  varying float vX;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;

    // Soft circular point with glow
    float alpha = pow(1.0 - d * 2.0, 1.5);

    // Fade at left/right edges
    float edgeFade = 1.0 - smoothstep(uHalfW * 0.72, uHalfW, abs(vX));
    alpha *= 0.68 * edgeFade;

    // Color ramp across elevation
    float t = clamp((vElevation + 3.0) / 6.0, 0.0, 1.0);
    vec3 col = t < 0.5
      ? mix(uColorLow, uColorMid, t * 2.0)
      : mix(uColorMid, uColorHigh, (t - 0.5) * 2.0);

    gl_FragColor = vec4(col, alpha);
  }
`;

function Wave() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const COLS = 100, ROWS = 70;
  const W = 28, D = 16;
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
    uColorLow:  { value: new THREE.Color('#bfdbfe') },
    uColorMid:  { value: new THREE.Color('#60a5fa') },
    uColorHigh: { value: new THREE.Color('#2563eb') },
    uHalfW:     { value: W / 2 },
  }), []);

  useFrame((s) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = s.clock.elapsedTime * 0.20;
  });

  return (
    <group position={[0.5, -1.8, -4.5]} rotation={[0.06, 0, 0]}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <shaderMaterial
          ref={matRef}
          vertexShader={waveVert}
          fragmentShader={waveFrag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. SCIENTIFIC NETWORK — nodes + connecting lines
// ─────────────────────────────────────────────────────────────────────────────

function Network() {
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const { nodePos, linePos } = useMemo(() => {
    const rng = (s: number) => (Math.random() - 0.5) * s;
    const nodes: THREE.Vector3[] = Array.from({ length: 30 }, () =>
      new THREE.Vector3(rng(26), rng(7), rng(8) - 1.5)
    );
    const lines: number[] = [];
    const maxD = 6;
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
      <lineSegments>
        <bufferGeometry ref={geoRef}>
          <bufferAttribute attach="attributes-position" args={[linePos, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#3b82f6" transparent opacity={0.09} depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nodePos, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#93c5fd" size={0.07} transparent opacity={0.55} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. PARTICLES — instanced, full-width, multiple depths
// ─────────────────────────────────────────────────────────────────────────────

function Particles({ count = 280, depth = 'mid' }: { count?: number; depth?: 'bg'|'mid'|'fg' }) {
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const zRange = depth === 'bg' ? [-3, -8] : depth === 'fg' ? [1, 3] : [-1, -3];
  const size   = depth === 'fg' ? 0.055 : 0.035;
  const opacity= depth === 'fg' ? 0.55  : 0.40;

  const { pos, seed } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p[i * 3]     = (Math.random() - 0.5) * 26;
      p[i * 3 + 1] = (Math.random() - 0.5) * 8;
      p[i * 3 + 2] = THREE.MathUtils.lerp(zRange[0], zRange[1], Math.random());
      s[i]         = Math.random() * Math.PI * 2;
    }
    return { pos: p, seed: s };
  }, [count]);

  const orig = useMemo(() => new Float32Array(pos), [pos]);

  useFrame((state) => {
    if (!geoRef.current) return;
    const t = state.clock.elapsedTime;
    const a = geoRef.current.attributes.position.array as Float32Array;
    const spd = depth === 'fg' ? 0.35 : 0.22;
    for (let i = 0; i < count; i++) {
      const ph = seed[i];
      a[i*3]   = orig[i*3]   + Math.sin(t * spd + ph)       * 0.45;
      a[i*3+1] = orig[i*3+1] + Math.cos(t * spd + ph + 1.1) * 0.55;
      a[i*3+2] = orig[i*3+2] + Math.sin(t * spd * 0.7 + ph) * 0.30;
    }
    geoRef.current.attributes.position.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#60a5fa"
        size={size}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. PAPER TEXTURE — drawn on HTML Canvas, then used as THREE.CanvasTexture
// ─────────────────────────────────────────────────────────────────────────────

function makePaperTexture(): THREE.CanvasTexture {
  const W = 900, H = 1260;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const cx = cv.getContext('2d')!;

  // Paper base
  cx.fillStyle = '#ffffff';
  cx.fillRect(0, 0, W, H);
  const shadow = cx.createLinearGradient(0, 0, 0, H);
  shadow.addColorStop(0, 'rgba(248,250,252,0)');
  shadow.addColorStop(1, 'rgba(241,245,249,0.7)');
  cx.fillStyle = shadow; cx.fillRect(0, 0, W, H);

  // Top accent
  cx.fillStyle = '#1e3a5f'; cx.fillRect(0, 0, W, 8);

  const pad = 60; let y = 48;

  cx.font = 'bold 19px "Times New Roman",Georgia,serif';
  cx.fillStyle = '#1e3a5f';
  cx.fillText('International Journal of Advanced Research', pad, y); y += 26;

  cx.font = '15px Arial,sans-serif'; cx.fillStyle = '#64748b';
  cx.fillText('Vol. 10, No. 2, March 2024, pp. 123–145  ·  DOI: 10.1234/ijar.2024.56789', pad, y); y += 20;

  cx.strokeStyle = '#cbd5e1'; cx.lineWidth = 1;
  cx.beginPath(); cx.moveTo(pad, y); cx.lineTo(W - pad, y); cx.stroke(); y += 22;

  cx.font = 'bold 26px "Times New Roman",Georgia,serif'; cx.fillStyle = '#0f172a';
  y = wrapText2(cx, 'Machine Learning Approaches for Advancing Scientific Discovery', pad, y, W - pad * 2, 33) + 10;

  cx.font = '17px Arial,sans-serif'; cx.fillStyle = '#1d6fa8';
  cx.fillText('A. R. Kumar¹ · S. Patel² · T. Chen³ · M. Williams⁴', pad, y); y += 22;
  cx.font = '13px Arial,sans-serif'; cx.fillStyle = '#94a3b8';
  cx.fillText('¹IIT Delhi  ²MIT  ³Stanford  ⁴ETH Zürich', pad, y); y += 22;
  cx.strokeStyle = '#e2e8f0'; cx.beginPath(); cx.moveTo(pad, y); cx.lineTo(W - pad, y); cx.stroke(); y += 20;

  // Abstract
  cx.font = 'bold 20px "Times New Roman",serif'; cx.fillStyle = '#0f172a';
  cx.fillText('Abstract', pad, y); y += 24;
  cx.font = '14px Arial,sans-serif'; cx.fillStyle = '#334155';
  y = wrapText2(cx, 'This study presents a comprehensive analysis of emerging trends in artificial intelligence and their applications in scientific research. We propose a novel framework integrating machine learning models with domain-specific knowledge to enhance prediction accuracy and interpretability. Experimental results demonstrate significant improvements over existing methods across multiple benchmark datasets.', pad, y, W - pad * 2, 20) + 8;

  cx.font = 'bold 13px Arial'; cx.fillStyle = '#475569';
  cx.fillText('Keywords:', pad, y);
  cx.font = '13px Arial'; cx.fillStyle = '#64748b';
  cx.fillText('  machine learning · knowledge graphs · NLP · scientific discovery', pad + 68, y); y += 22;

  cx.strokeStyle = '#e2e8f0'; cx.beginPath(); cx.moveTo(pad, y); cx.lineTo(W - pad, y); cx.stroke(); y += 18;

  // Chart area
  const ch = 175;
  cx.fillStyle = '#f8fafc'; cx.strokeStyle = '#e2e8f0'; cx.lineWidth = 1;
  cx.fillRect(pad, y, W - pad * 2, ch); cx.strokeRect(pad, y, W - pad * 2, ch);
  const ax = pad + 25, ay = y + ch - 22, aw = W - pad * 2 - 50, ah = ch - 44;

  // Axes
  cx.strokeStyle = '#94a3b8'; cx.lineWidth = 1.5;
  cx.beginPath(); cx.moveTo(ax, ay - ah); cx.lineTo(ax, ay); cx.lineTo(ax + aw, ay); cx.stroke();

  // Data
  const data = [0.28, 0.40, 0.52, 0.59, 0.67, 0.74, 0.80, 0.85, 0.90, 0.94];
  cx.beginPath(); cx.strokeStyle = '#3b82f6'; cx.lineWidth = 2.5;
  data.forEach((v, i) => {
    const px = ax + (i / (data.length - 1)) * aw;
    const py = ay - v * ah;
    i === 0 ? cx.moveTo(px, py) : cx.lineTo(px, py);
  });
  cx.stroke();

  // Fill
  cx.beginPath();
  data.forEach((v, i) => {
    const px = ax + (i / (data.length - 1)) * aw;
    const py = ay - v * ah;
    i === 0 ? cx.moveTo(px, py) : cx.lineTo(px, py);
  });
  cx.lineTo(ax + aw, ay); cx.lineTo(ax, ay); cx.closePath();
  const g = cx.createLinearGradient(0, ay - ah, 0, ay);
  g.addColorStop(0, 'rgba(59,130,246,0.22)'); g.addColorStop(1, 'rgba(59,130,246,0)');
  cx.fillStyle = g; cx.fill();

  // Dots
  data.forEach((v, i) => {
    const px = ax + (i / (data.length - 1)) * aw;
    const py = ay - v * ah;
    cx.beginPath(); cx.arc(px, py, 3, 0, Math.PI * 2);
    cx.fillStyle = '#3b82f6'; cx.fill();
  });

  // X labels
  cx.font = '11px Arial'; cx.fillStyle = '#94a3b8'; cx.textAlign = 'center';
  ['2018','2019','2020','2021','2022','2023','2024'].forEach((l, i) => {
    cx.fillText(l, ax + (i / 6) * aw, ay + 16);
  });
  cx.textAlign = 'left';
  y += ch + 16;

  // Sections
  cx.font = 'bold 19px "Times New Roman",serif'; cx.fillStyle = '#0f172a';
  cx.fillText('1. Introduction', pad, y); y += 23;
  cx.font = '13.5px Arial'; cx.fillStyle = '#334155';
  y = wrapText2(cx, 'Recent advancements in AI have transformed research across disciplines. The ability to analyze large-scale data, identify patterns, and generate insights has opened new possibilities for innovation and scientific discovery.', pad, y, W - pad * 2, 19) + 14;

  cx.font = 'bold 19px "Times New Roman",serif'; cx.fillStyle = '#0f172a';
  cx.fillText('2. Methodology', pad, y); y += 23;
  cx.font = '13.5px Arial'; cx.fillStyle = '#334155';
  y = wrapText2(cx, 'Our pipeline consists of four modules: data ingestion and preprocessing, feature extraction using transformer-based encoders, multi-task learning objective, and post-hoc interpretability via attention visualization.', pad, y, W - pad * 2, 19) + 14;

  cx.font = 'bold 19px "Times New Roman",serif'; cx.fillStyle = '#0f172a';
  cx.fillText('3. Results', pad, y); y += 23;
  cx.font = '13.5px Arial'; cx.fillStyle = '#334155';
  wrapText2(cx, 'Our approach achieves 94.3% accuracy on standard benchmarks, outperforming the previous state-of-the-art by 3.8%. Cross-domain evaluation confirms robust generalization across all tested datasets.', pad, y, W - pad * 2, 19);

  return new THREE.CanvasTexture(cv);
}

function wrapText2(cx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): number {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (cx.measureText(t).width > maxW && line) { cx.fillText(line, x, y); y += lh; line = w; }
    else line = t;
  }
  if (line) { cx.fillText(line, x, y); y += lh; }
  return y;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PAPER STACK
// ─────────────────────────────────────────────────────────────────────────────

const pageMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.75, metalness: 0 });

function PaperStack() {
  const groupRef = useRef<THREE.Group>(null);
  const TOTAL = 6;
  const tex = useMemo(() => makePaperTexture(), []);

  useFrame((s) => {
    if (!groupRef.current) return;
    const t = s.clock.elapsedTime;
    groupRef.current.position.y = Math.sin(t * 0.48) * 0.18;
    groupRef.current.rotation.y = -0.18 + Math.sin(t * 0.27) * 0.035;
    groupRef.current.rotation.z =         Math.sin(t * 0.38) * 0.008;
  });

  return (
    <group
      ref={groupRef}
      rotation={[-0.12, -0.20, 0.04]}  // small angles only — shows front face
      scale={1.1}
    >
      {Array.from({ length: TOTAL }).map((_, i) => {
        const isTop = i === TOTAL - 1;
        const zOff = (TOTAL - 1 - i) * 0.045;
        const fan  = ((i - (TOTAL - 1) / 2) / TOTAL) * 0.04;
        return (
          <group key={i} position={[0, 0, -zOff]} rotation={[0, fan, 0]}>
            {/* Paper body */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[3.2, 4.4, 0.022]} />
              <primitive object={pageMat} attach="material" />
            </mesh>
            {/* Front face texture on top paper */}
            {isTop && (
              <mesh position={[0, 0, 0.012]}>
                <planeGeometry args={[3.2, 4.4]} />
                <meshStandardMaterial map={tex} roughness={0.78} metalness={0} />
              </mesh>
            )}
            {/* Edge shadow strip */}
            {isTop && (
              <mesh position={[0, -2.2, -0.03]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[3.2, 0.5]} />
                <meshStandardMaterial color="#0f172a" transparent opacity={0.08} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. MOLECULE
// ─────────────────────────────────────────────────────────────────────────────

const MOL_NODES: [number, number, number][] = [
  [0, 0, 0], [1.1, 0.7, 0.3], [-0.9, -0.6, 0.5],
  [0.3, -1.1, -0.4], [-0.7, 0.95, -0.3], [0.55, 0.2, -0.95],
];
const MOL_LINKS: [number, number][] = [[0,1],[0,2],[0,3],[0,4],[0,5],[1,4],[2,3]];

function Molecule() {
  const ref = useRef<THREE.Group>(null);

  const sMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#1a5fa8', metalness: 0.6, roughness: 0.07,
    clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 3,
  }), []);

  const bMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#60a5fa', metalness: 0.3, roughness: 0.3, transparent: true, opacity: 0.85,
  }), []);

  const bonds = useMemo(() => MOL_LINKS.map(([i, j]) => {
    const a = new THREE.Vector3(...MOL_NODES[i]);
    const b = new THREE.Vector3(...MOL_NODES[j]);
    return {
      d: a.distanceTo(b),
      m: a.clone().lerp(b, 0.5).toArray() as [number,number,number],
      q: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0,1,0), b.clone().sub(a).normalize()
      ),
    };
  }), []);

  useFrame((s) => {
    if (ref.current) {
      ref.current.rotation.y = s.clock.elapsedTime * 0.15;
      ref.current.rotation.x = s.clock.elapsedTime * 0.07;
    }
  });

  return (
    <Float speed={1.1} floatIntensity={0.45} rotationIntensity={0.04}>
      <group ref={ref} position={[6.0, -0.5, 0.5]} scale={0.75}>
        {MOL_NODES.map((p, i) => (
          <mesh key={i} position={p} material={sMat} castShadow>
            <sphereGeometry args={[i === 0 ? 0.37 : 0.20, 32, 32]} />
          </mesh>
        ))}
        {bonds.map(({ d, m, q }, i) => (
          <mesh key={i} position={m} quaternion={q} material={bMat}>
            <cylinderGeometry args={[0.028, 0.028, d, 8]} />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. CAMERA + LIGHTING
// ─────────────────────────────────────────────────────────────────────────────

const _camTarget = new THREE.Vector3();
function SceneRig() {
  const { camera, pointer } = useThree();

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const idle = { x: Math.sin(t * 0.13) * 0.10, y: Math.cos(t * 0.09) * 0.07 };
    _camTarget.set(
      idle.x + pointer.x * 0.18,
      0.4 + idle.y + pointer.y * 0.10,
      11
    );
    camera.position.lerp(_camTarget, 0.028);
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[7, 10, 10]} intensity={2.8} castShadow shadow-mapSize={[1024, 1024]} />
      <spotLight position={[-10, 5, -3]} intensity={7} color="#3b82f6" penumbra={1} angle={0.45} />
      <pointLight position={[5, -4, 6]}  intensity={1.8} color="#dbeafe" />
      <pointLight position={[-9, 1, 2]}  intensity={1.0} color="#60a5fa" />
      <pointLight position={[-2, 2, -7]} intensity={1.2} color="#1d4ed8" />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export default function HeroCinematicScene() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
        camera={{ position: [0, 0.4, 11], fov: 55, near: 0.1, far: 120 }}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={['transparent']} />

        {/* Camera and lighting always present */}
        <SceneRig />

        <Suspense fallback={null}>
          {/* Layer 1 — background particles (far) */}
          <Particles count={160} depth="bg" />

          {/* Layer 2 — HUGE procedural wave */}
          <Wave />

          {/* Layer 3 — scientific network */}
          <Network />

          {/* Layer 4 — mid particles */}
          <Particles count={180} depth="mid" />

          {/* Layer 5 — paper stack (right of center) */}
          <group position={[2.8, 0.1, 0]}>
            <PaperStack />
          </group>

          {/* Layer 6 — molecule (further right) */}
          <Molecule />

          {/* Layer 7 — foreground particles */}
          <Particles count={60} depth="fg" />

          <Environment preset="studio" />
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
}
