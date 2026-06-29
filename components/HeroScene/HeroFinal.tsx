'use client';

/**
 * HeroFinal — Hybrid cinematic hero
 *
 * Layers:
 *  CSS  – background image (atmosphere)
 *  CSS  – gradient blend
 *  CSS  – animated particles
 *  WebGL – stable animated wave (GLSL, frustumCulled=false)
 *  WebGL – paper stack + molecule + sparkles
 */

import React, { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Environment, Preload } from '@react-three/drei';
import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════════════════════
// STABLE ANIMATED WAVE (JS ANIMATED)
// Moving the math to JS ensures 100% stability. No ShaderMaterial bugs,
// no recompilation drops when Environment loads, and totally immune to GLSL crashes.
// ═══════════════════════════════════════════════════════════════════════════════
function StableWave() {
  const geoRef = useRef<THREE.BufferGeometry>(null);
  // Extremely high density for a solid, vibrant glowing sheet
  const COLS = 250, ROWS = 80, W = 28, D = 8;
  const count = COLS * ROWS;

  // Initial geometry built ONCE
  const { pos, colors, orig } = useMemo(() => {
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);
    const o = new Float32Array(count * 3);
    const low = new THREE.Color('#00d2ff');  // Extremely vibrant electric cyan
    const high = new THREE.Color('#0044ff'); // Ultra-rich deep electric blue

    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        const i = r * COLS + col;
        const x = (col / (COLS - 1) - 0.5) * W;
        const z = (r / (ROWS - 1) - 0.5) * D;
        p[i * 3] = x; p[i * 3 + 1] = 0; p[i * 3 + 2] = z;
        o[i * 3] = x; o[i * 3 + 1] = 0; o[i * 3 + 2] = z;

        // Base color mixed based on z depth for a nice gradient
        const mixVal = r / (ROWS - 1);
        const color = low.clone().lerp(high, mixVal);
        c[i * 3] = color.r; c[i * 3 + 1] = color.g; c[i * 3 + 2] = color.b;
      }
    }
    return { pos: p, colors: c, orig: o };
  }, []);

  useFrame((state) => {
    if (!geoRef.current) return;
    const t = state.clock.elapsedTime;
    const a = geoRef.current.attributes.position.array as Float32Array;

    // Fast JS math (5850 points is ~1ms, well within 16ms frame budget)
    for (let i = 0; i < count; i++) {
      const x = orig[i * 3];
      const z = orig[i * 3 + 2];
      
      // Scaled up displacement for a larger ribbon, keeping softer intensity
      let e = Math.sin(x * 0.44 + t * 0.24) * 1.35;
      e += Math.cos(z * 0.62 - t * 0.18) * 0.75;
      e += Math.sin((x * 0.30 + z * 0.28) + t * 0.13) * 1.05;
      e += Math.cos(x * 0.21 - t * 0.09) * 0.65;
      e += Math.sin(z * 0.47 + t * 0.16) * 0.40;

      a[i * 3 + 1] = e; // Animate Y (elevation)
    }
    geoRef.current.attributes.position.needsUpdate = true;
  });

  return (
    <points
      position={[-1, -1.2, -6]}
      rotation={[0.10, -0.35, 0.08]}
      frustumCulled={false}
      renderOrder={-1}
    >
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        vertexColors={true}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          varying vec3 vColor;
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            // Reduced point size for lower intensity
            gl_PointSize = 30.0 / -mvPosition.z;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          void main() {
            float dist = distance(gl_PointCoord, vec2(0.5));
            if (dist > 0.5) discard;
            // Reduced alpha multiplier for lower intensity
            float alpha = smoothstep(0.5, 0.0, dist) * 1.0;
            gl_FragColor = vec4(vColor, alpha);
          }
        `}
      />
    </points>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAPER TEXTURE
// ═══════════════════════════════════════════════════════════════════════════════

function makePaperTexture(): THREE.CanvasTexture {
  const W = 900, H = 1260;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const cx = cv.getContext('2d')!;

  cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, W, H);
  const sh = cx.createLinearGradient(0, 0, 0, H);
  sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(241,245,249,0.5)');
  cx.fillStyle = sh; cx.fillRect(0, 0, W, H);
  cx.fillStyle = '#1e3a5f'; cx.fillRect(0, 0, W, 8);

  const pad = 58; let y = 46;
  cx.font = 'bold 18px "Times New Roman",Georgia,serif'; cx.fillStyle = '#1e3a5f';
  cx.fillText('International Journal of Advanced Research', pad, y); y += 24;
  cx.font = '14px Arial,sans-serif'; cx.fillStyle = '#64748b';
  cx.fillText('Vol. 10, No. 2, March 2024  ·  DOI: 10.1234/ijar.2024.56789', pad, y); y += 18;
  cx.strokeStyle = '#cbd5e1'; cx.lineWidth = 1;
  cx.beginPath(); cx.moveTo(pad, y); cx.lineTo(W - pad, y); cx.stroke(); y += 20;

  cx.font = 'bold 24px "Times New Roman",Georgia,serif'; cx.fillStyle = '#0f172a';
  y = wrap(cx, 'Machine Learning Approaches for Advancing Scientific Discovery', pad, y, W - pad * 2, 30) + 8;

  cx.font = '16px Arial,sans-serif'; cx.fillStyle = '#1d6fa8';
  cx.fillText('A. R. Kumar · S. Patel · T. Chen · M. Williams', pad, y); y += 20;
  cx.font = '12px Arial,sans-serif'; cx.fillStyle = '#94a3b8';
  cx.fillText('IIT Delhi  ·  MIT  ·  Stanford  ·  ETH Zürich', pad, y); y += 18;
  cx.strokeStyle = '#e2e8f0'; cx.beginPath(); cx.moveTo(pad, y); cx.lineTo(W - pad, y); cx.stroke(); y += 18;

  cx.font = 'bold 19px "Times New Roman",serif'; cx.fillStyle = '#0f172a';
  cx.fillText('Abstract', pad, y); y += 22;
  cx.font = '13.5px Arial,sans-serif'; cx.fillStyle = '#334155';
  y = wrap(cx, 'This study presents a comprehensive analysis of emerging trends in artificial intelligence and their applications in scientific research. We propose a novel framework integrating machine learning models with domain-specific knowledge to enhance prediction accuracy and interpretability. Experimental results demonstrate significant improvements across multiple benchmark datasets.', pad, y, W - pad * 2, 18) + 8;

  cx.font = 'bold 12px Arial'; cx.fillStyle = '#475569'; cx.fillText('Keywords:', pad, y);
  cx.font = '12px Arial'; cx.fillStyle = '#64748b';
  cx.fillText('  machine learning · NLP · scientific discovery', pad + 65, y); y += 20;
  cx.strokeStyle = '#e2e8f0'; cx.beginPath(); cx.moveTo(pad, y); cx.lineTo(W - pad, y); cx.stroke(); y += 16;

  const ch = 165;
  cx.fillStyle = '#f8fafc'; cx.strokeStyle = '#e2e8f0'; cx.lineWidth = 1;
  cx.fillRect(pad, y, W - pad * 2, ch); cx.strokeRect(pad, y, W - pad * 2, ch);
  const ax = pad + 22, ay = y + ch - 20, aw = W - pad * 2 - 44, ah = ch - 40;
  cx.strokeStyle = '#94a3b8'; cx.lineWidth = 1.5;
  cx.beginPath(); cx.moveTo(ax, ay - ah); cx.lineTo(ax, ay); cx.lineTo(ax + aw, ay); cx.stroke();
  const data = [0.28, 0.40, 0.52, 0.59, 0.67, 0.74, 0.80, 0.85, 0.90, 0.94];
  cx.beginPath(); cx.strokeStyle = '#3b82f6'; cx.lineWidth = 2.5;
  data.forEach((v, i) => { const px = ax + (i / (data.length - 1)) * aw, py = ay - v * ah; i === 0 ? cx.moveTo(px, py) : cx.lineTo(px, py); });
  cx.stroke();
  cx.beginPath();
  data.forEach((v, i) => { const px = ax + (i / (data.length - 1)) * aw, py = ay - v * ah; i === 0 ? cx.moveTo(px, py) : cx.lineTo(px, py); });
  cx.lineTo(ax + aw, ay); cx.lineTo(ax, ay); cx.closePath();
  const g = cx.createLinearGradient(0, ay - ah, 0, ay);
  g.addColorStop(0, 'rgba(59,130,246,0.2)'); g.addColorStop(1, 'rgba(59,130,246,0)');
  cx.fillStyle = g; cx.fill();
  data.forEach((v, i) => { const px = ax + (i / (data.length - 1)) * aw, py = ay - v * ah; cx.beginPath(); cx.arc(px, py, 3, 0, Math.PI * 2); cx.fillStyle = '#3b82f6'; cx.fill(); });
  cx.font = '10px Arial'; cx.fillStyle = '#94a3b8'; cx.textAlign = 'center';
  ['2018', '2020', '2022', '2024'].forEach((l, i) => cx.fillText(l, ax + (i / 3) * aw, ay + 14));
  cx.textAlign = 'left'; y += ch + 14;

  cx.font = 'bold 18px "Times New Roman",serif'; cx.fillStyle = '#0f172a';
  cx.fillText('1. Introduction', pad, y); y += 21;
  cx.font = '13.5px Arial'; cx.fillStyle = '#334155';
  y = wrap(cx, 'Recent advancements in AI have transformed research across disciplines. The ability to analyze large-scale data opens new possibilities for scientific discovery.', pad, y, W - pad * 2, 18) + 12;

  cx.font = 'bold 18px "Times New Roman",serif'; cx.fillStyle = '#0f172a';
  cx.fillText('2. Methodology', pad, y); y += 21;
  cx.font = '13.5px Arial'; cx.fillStyle = '#334155';
  wrap(cx, 'Our pipeline consists of: data ingestion and preprocessing, feature extraction using transformer-based encoders, multi-task learning, and post-hoc interpretability via attention visualization.', pad, y, W - pad * 2, 18);

  return new THREE.CanvasTexture(cv);
}

function wrap(cx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): number {
  let line = '';
  for (const w of text.split(' ')) {
    const t = line ? `${line} ${w}` : w;
    if (cx.measureText(t).width > maxW && line) { cx.fillText(line, x, y); y += lh; line = w; }
    else line = t;
  }
  if (line) { cx.fillText(line, x, y); y += lh; }
  return y;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAPER STACK (Refined Premium Quality)
// ═══════════════════════════════════════════════════════════════════════════════
const pageMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, metalness: 0.1 });

function createCurvedPaperGeometry() {
  const geom = new THREE.BoxGeometry(3.2, 4.5, 0.024, 48, 48, 1);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // Smooth parabolic curve, more pronounced at the top right corner
    const zOffset = (x * x) * 0.09 + (y * y) * 0.03 + (x > 0 && y > 0 ? (x * y) * 0.05 : 0); 
    pos.setZ(i, pos.getZ(i) - zOffset);
  }
  geom.computeVertexNormals();
  return geom;
}

function createCurvedPlaneGeometry() {
  const geom = new THREE.PlaneGeometry(3.2, 4.5, 48, 48);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const zOffset = (x * x) * 0.09 + (y * y) * 0.03 + (x > 0 && y > 0 ? (x * y) * 0.05 : 0); 
    pos.setZ(i, pos.getZ(i) - zOffset);
  }
  geom.computeVertexNormals();
  return geom;
}

function PaperStack() {
  const groupRef = useRef<THREE.Group>(null);
  const papersRef = useRef<(THREE.Group | null)[]>([]);
  const TOTAL = 6;
  const tex = useMemo(() => makePaperTexture(), []);
  const curvedBox = useMemo(() => createCurvedPaperGeometry(), []);
  const curvedPlane = useMemo(() => createCurvedPlaneGeometry(), []);

  useFrame((s) => {
    if (!groupRef.current) return;
    const t = s.clock.elapsedTime;
    
    // Group global gentle breathing
    groupRef.current.position.y = Math.sin(t * 0.40) * 0.15;
    groupRef.current.rotation.y = -0.15 + Math.sin(t * 0.22) * 0.03;
    groupRef.current.rotation.z = Math.sin(t * 0.35) * 0.01;

    // Individual paper lag (back pages trail the front page)
    papersRef.current.forEach((paper, i) => {
      if (!paper) return;
      const delay = (TOTAL - i) * 0.15; // Front page (i=5) has 0 delay, back has max delay
      paper.rotation.x = Math.sin(t * 0.5 - delay) * 0.015;
      paper.rotation.y = Math.cos(t * 0.4 - delay) * 0.015;
    });
  });

  return (
    <group ref={groupRef} rotation={[-0.10, -0.22, 0.05]} scale={1.15}>
      {Array.from({ length: TOTAL }).map((_, i) => {
        const isTop = i === TOTAL - 1;
        const zOff = (TOTAL - 1 - i) * 0.055;
        const fan = ((i - (TOTAL - 1) / 2) / TOTAL) * 0.05;
        
        return (
          <group 
            key={i} 
            ref={el => { papersRef.current[i] = el; }}
            position={[0, 0, -zOff]} 
            rotation={[0, fan, 0]}
          >
            <mesh castShadow receiveShadow geometry={curvedBox}>
              <meshStandardMaterial 
                color={new THREE.Color().setHSL(0, 0, 0.98 - (TOTAL - 1 - i) * 0.03)} 
                roughness={0.6} 
                metalness={0.1} 
              />
            </mesh>
            {isTop && (
              <mesh position={[0, 0, 0.013]} geometry={curvedPlane}>
                <meshStandardMaterial map={tex} roughness={0.65} metalness={0.1} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOLECULE (Independent Orbit)
// ═══════════════════════════════════════════════════════════════════════════════
const M_NODES: [number, number, number][] = [
  [0, 0, 0], [1.1, 0.7, 0.3], [-0.9, -0.6, 0.5], [0.3, -1.1, -0.4], [-0.7, 0.95, -0.3], [0.55, 0.2, -0.95]
];
const M_LINKS: [number, number][] = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 4], [2, 3]];

function Molecule(props: { basePosition?: [number, number, number], direction?: number, scaleFactor?: number }) {
  const orbitRef = useRef<THREE.Group>(null);
  const molRef = useRef<THREE.Group>(null);
  
  const sM = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#1a5fa8', metalness: 0.8, roughness: 0.05,
    clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 4,
  }), []);
  const bM = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#60a5fa', metalness: 0.5, roughness: 0.2, transparent: true, opacity: 0.7,
  }), []);
  
  const bonds = useMemo(() => M_LINKS.map(([i, j]) => {
    const a = new THREE.Vector3(...M_NODES[i]), b = new THREE.Vector3(...M_NODES[j]);
    return {
      d: a.distanceTo(b),
      m: a.clone().lerp(b, 0.5).toArray() as [number, number, number],
      q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()),
    };
  }), []);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (orbitRef.current) {
      // Slow orbit around the paper stack area
      orbitRef.current.position.y = Math.sin(t * 0.3) * 0.4;
      orbitRef.current.position.x = 2.5 + Math.cos(t * 0.15) * 1.5;
      orbitRef.current.position.z = 1.0 + Math.sin(t * 0.15) * 1.5;
    }
    if (molRef.current) {
      molRef.current.rotation.y = t * 0.25;
      molRef.current.rotation.x = t * 0.15;
    }
  });

  return (
    <group ref={orbitRef}>
      <Float speed={1.5} floatIntensity={0.6} rotationIntensity={0.1}>
        <group ref={molRef} scale={0.55}>
          {M_NODES.map((p, i) => (
            <mesh key={i} position={p} material={sM} castShadow>
              <sphereGeometry args={[i === 0 ? 0.38 : 0.20, 32, 32]} />
            </mesh>
          ))}
          {bonds.map(({ d, m, q }, i) => (
            <mesh key={i} position={m} quaternion={q} material={bM}>
              <cylinderGeometry args={[0.022, 0.022, d, 8]} />
            </mesh>
          ))}
        </group>
      </Float>
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOREGROUND SPARKLES (Minimalist)
// ═══════════════════════════════════════════════════════════════════════════════
function Sparkles() {
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const COUNT = 50; // Ultra minimalist
  
  const { pos, sizes } = useMemo(() => {
    const p = new Float32Array(COUNT * 3);
    const s = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      p[i * 3] = (Math.random() - 0.5) * 24;
      p[i * 3 + 1] = (Math.random() - 0.5) * 12;
      const z = (Math.random() - 0.5) * 8 + 1.0;
      p[i * 3 + 2] = z;
      // Particles closer to camera are larger, distant ones are tiny
      s[i] = 0.03 + Math.max(0, z) * 0.015;
    }
    return { pos: p, sizes: s };
  }, []);
  
  const seed = useMemo(() => { const a = new Float32Array(COUNT); for (let i = 0; i < COUNT; i++) a[i] = Math.random() * Math.PI * 2; return a; }, []);
  const orig = useMemo(() => new Float32Array(pos), [pos]);

  useFrame((s) => {
    if (!geoRef.current) return;
    const t = s.clock.elapsedTime, a = geoRef.current.attributes.position.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const ph = seed[i], sp = 0.15 + ph * 0.05;
      a[i * 3] = orig[i * 3] + Math.sin(t * sp + ph) * 0.6;
      a[i * 3 + 1] = orig[i * 3 + 1] + Math.cos(t * sp + ph + 1.1) * 0.4;
    }
    geoRef.current.attributes.position.needsUpdate = true;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          attribute float size;
          varying float vOpacity;
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            // Far particles are smaller and less opaque
            float depth = -mvPosition.z;
            vOpacity = smoothstep(15.0, 2.0, depth) * 0.5;
            gl_PointSize = size * (300.0 / depth);
          }
        `}
        fragmentShader={`
          varying float vOpacity;
          void main() {
            // Draw a soft circle
            float dist = distance(gl_PointCoord, vec2(0.5));
            if (dist > 0.5) discard;
            float alpha = (0.5 - dist) * 2.0 * vOpacity;
            gl_FragColor = vec4(0.38, 0.65, 0.98, alpha);
          }
        `}
      />
    </points>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCIENTIFIC NETWORK (Nodes & Lines in background)
// ═══════════════════════════════════════════════════════════════════════════════
function Network() {
  const groupRef = useRef<THREE.Group>(null);
  const COUNT = 15;
  const DISTANCE = 5.0;

  // Generate random stable nodes
  const { nodes, lines } = useMemo(() => {
    const pts = Array.from({ length: COUNT }, () => new THREE.Vector3(
      (Math.random() - 0.5) * 15,
      (Math.random() - 0.5) * 8 + 1,
      (Math.random() - 0.5) * 8 - 4
    ));

    const connections: { a: THREE.Vector3; b: THREE.Vector3; d: number }[] = [];
    for (let i = 0; i < COUNT; i++) {
      for (let j = i + 1; j < COUNT; j++) {
        const d = pts[i].distanceTo(pts[j]);
        if (d < DISTANCE) connections.push({ a: pts[i], b: pts[j], d });
      }
    }
    return { nodes: pts, lines: connections };
  }, []);

  const nodeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#3b82f6', metalness: 0.8, roughness: 0.2 }), []);
  const lineMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#60a5fa', transparent: true, opacity: 0.15 }), []);

  useFrame((s) => {
    if (!groupRef.current) return;
    const t = s.clock.elapsedTime;
    groupRef.current.position.y = Math.sin(t * 0.1) * 0.2;
    groupRef.current.rotation.y = Math.sin(t * 0.05) * 0.05;
  });

  return (
    <group ref={groupRef}>
      {nodes.map((p, i) => (
        <mesh key={`n-${i}`} position={p} material={nodeMat}>
          <sphereGeometry args={[0.08, 16, 16]} />
        </mesh>
      ))}
      {lines.map(({ a, b, d }, i) => {
        const mid = a.clone().lerp(b, 0.5);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        return (
          <mesh key={`l-${i}`} position={mid} quaternion={q} material={lineMat}>
            <cylinderGeometry args={[0.01, 0.01, d, 4]} />
          </mesh>
        );
      })}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMERA RIG + CINEMATIC LIGHTING
// ═══════════════════════════════════════════════════════════════════════════════
const _ct = new THREE.Vector3();
function Rig() {
  const { camera, pointer } = useThree();
  
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    
    // Very subtle cinematic zoom + parallax
    const targetZ = 9.5 + Math.sin(t * 0.05) * 0.5;
    
    _ct.set(
      Math.sin(t * 0.08) * 0.05 + pointer.x * 0.15,
      0.3 + Math.cos(t * 0.06) * 0.05 + pointer.y * 0.15,
      targetZ
    );
    camera.position.lerp(_ct, 0.02);
    camera.lookAt(0, 0, 0);
  });
  
  return (
    <>
      <ambientLight intensity={0.5} color="#ffffff" />
      {/* Warm Key Light */}
      <directionalLight position={[6, 9, 8]} intensity={3.5} color="#fff5e6" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001} />
      {/* Cool Blue Rim Light */}
      <spotLight position={[-8, 5, -5]} intensity={12} color="#60a5fa" penumbra={1} angle={0.5} castShadow />
      {/* Soft Fill Light */}
      <pointLight position={[4, -4, 5]} intensity={1.5} color="#e0e7ff" />
      {/* Atmospheric Volumetric Halo Behind Paper */}
      <pointLight position={[1.5, 0, -2]} intensity={4.0} color="#3b82f6" distance={8} decay={2} />
    </>
  );
}

// CSS PARTICLES DELETED TO REMOVE VISUAL NOISE
// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════════════════
export default function HeroFinal() {
  return (
    <div className="absolute inset-0 w-full h-full">

      {/* Layer 1 — Premium clean gradient background */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f0f5ff 50%, #e0ebff 100%)',
        zIndex: 1,
      }} />


      {/* Layer 3 — THREE.js: wave + papers + molecule */}
      <div className="absolute inset-0 w-full h-full" style={{ zIndex: 3 }}>
        <Canvas
          shadows
          dpr={[1, 1.5]}
          gl={{ antialias: true, powerPreference: 'high-performance', alpha: true }}
          camera={{ position: [0, 0.3, 9], fov: 48, near: 0.1, far: 100 }}
          style={{ background: 'transparent', width: '100%', height: '100%' }}
        >
          <Rig />

          <Suspense fallback={null}>
            {/* Animated scientific 3D wave */}
            <StableWave />

            {/* Background floating network moved UP so it doesn't collide with the wave */}
            <group position={[0, 4, -4]}>
              <Network />
            </group>

            {/* Paper Stack removed as requested */}

            {/* Two Molecules orbiting in opposite directions with decreased size */}
            <Molecule basePosition={[3.8, -1.5, -1.5]} direction={1} scaleFactor={0.20} />
            <Molecule basePosition={[-3.5, 1.2, -3.0]} direction={-1} scaleFactor={0.15} />

            {/* Minimalist foreground particles */}
            <Sparkles />
          </Suspense>
        </Canvas>
      </div>

    </div>
  );
}
