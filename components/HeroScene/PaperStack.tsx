'use client';

/**
 * PaperStack — premium floating research paper stack
 *
 * GEOMETRY APPROACH:
 *  - Each paper is a thin box: width=3 (X), height=4 (Y), depth=0.025 (Z)
 *  - Think of it like a sheet of paper held vertically, facing the camera (Z+)
 *  - The "front face" naturally faces forward toward the camera
 *  - We tilt the whole stack slightly (small X/Y rotations) for a premium perspective
 *  - Camera sits at [0, 0, 9] looking at origin → sees the front face directly
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Generate realistic paper texture via HTML Canvas ─────────────────────────
function createPaperTexture(): THREE.CanvasTexture {
  const W = 1024, H = 1400;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // White paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Subtle warm tint at bottom
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, 'rgba(255,255,255,0)');
  bg.addColorStop(1, 'rgba(248,250,252,0.6)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Top rule bar
  ctx.fillStyle = '#1e3a5f';
  ctx.fillRect(0, 0, W, 9);

  const pad = 70;
  let y = 52;

  // Journal name
  ctx.font = 'bold 21px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#1e3a5f';
  ctx.fillText('International Journal of Advanced Research', pad, y);
  y += 30;

  ctx.font = '17px Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Vol. 10, No. 2, March 2024  ·  DOI: 10.1234/ijar.2024.56789', pad, y);
  y += 24;

  // Hairline rule
  ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
  y += 28;

  // Paper title
  ctx.font = 'bold 30px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#0f172a';
  wrapText(ctx, 'Machine Learning Approaches for Advancing Scientific Discovery', pad, y, W - pad * 2, 38);
  y += 82;

  // Authors
  ctx.font = '18px Arial, sans-serif';
  ctx.fillStyle = '#1d6fa8';
  ctx.fillText('A. R. Kumar¹  ·  S. Patel²  ·  T. Chen³  ·  M. Williams⁴', pad, y);
  y += 25;

  ctx.font = '14px Arial, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('¹IIT Delhi   ²MIT   ³Stanford   ⁴ETH Zürich', pad, y);
  y += 28;

  ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
  y += 26;

  // Abstract
  ctx.font = 'bold 22px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('Abstract', pad, y); y += 30;

  ctx.font = '15.5px Arial, sans-serif';
  ctx.fillStyle = '#334155';
  const abstract = 'This study presents a comprehensive analysis of emerging trends in artificial intelligence and their applications in scientific research. We propose a novel framework that integrates machine learning models with domain-specific knowledge to enhance prediction accuracy and interpretability. Experimental results demonstrate significant improvements over existing methods across multiple benchmark datasets, suggesting the effectiveness of our approach in real-world scenarios.';
  y = wrapText(ctx, abstract, pad, y, W - pad * 2, 22) + 14;

  // Keywords
  ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#475569';
  ctx.fillText('Keywords: ', pad, y);
  ctx.font = '14px Arial'; ctx.fillStyle = '#64748b';
  ctx.fillText('machine learning · knowledge graphs · NLP · scientific discovery', pad + 76, y);
  y += 28;

  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(W - pad, y); ctx.stroke();
  y += 22;

  // Chart area
  const chartH = 190;
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  roundRect(ctx, pad, y, W - pad * 2, chartH, 4);
  ctx.fill(); ctx.stroke();

  // Chart axes
  const cx0 = pad + 28, cy0 = y + chartH - 24, cw = W - pad * 2 - 56, ch = chartH - 44;
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx0, cy0 - ch); ctx.lineTo(cx0, cy0); ctx.lineTo(cx0 + cw, cy0); ctx.stroke();

  // Performance line
  const dataY = [0.28, 0.42, 0.55, 0.60, 0.68, 0.75, 0.80, 0.84, 0.89, 0.94];
  ctx.beginPath(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2.5;
  dataY.forEach((v, i) => {
    const px = cx0 + (i / (dataY.length - 1)) * cw;
    const py = cy0 - v * ch;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  });
  ctx.stroke();

  // Fill under line
  ctx.beginPath();
  dataY.forEach((v, i) => {
    const px = cx0 + (i / (dataY.length - 1)) * cw;
    const py = cy0 - v * ch;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  });
  ctx.lineTo(cx0 + cw, cy0); ctx.lineTo(cx0, cy0); ctx.closePath();
  const areaGrad = ctx.createLinearGradient(0, cy0 - ch, 0, cy0);
  areaGrad.addColorStop(0, 'rgba(59,130,246,0.2)');
  areaGrad.addColorStop(1, 'rgba(59,130,246,0.0)');
  ctx.fillStyle = areaGrad; ctx.fill();

  // Chart data points
  dataY.forEach((v, i) => {
    const px = cx0 + (i / (dataY.length - 1)) * cw;
    const py = cy0 - v * ch;
    ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6'; ctx.fill();
  });

  // X axis labels
  const years = ['2018','2019','2020','2021','2022','2023','2024','2024','2025','2026'];
  ctx.font = '13px Arial'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'center';
  [0,2,4,6,8].forEach(i => {
    const px = cx0 + (i / (dataY.length - 1)) * cw;
    ctx.fillText(years[i], px, cy0 + 16);
  });
  ctx.textAlign = 'left';
  y += chartH + 20;

  // Introduction section
  ctx.font = 'bold 20px "Times New Roman", serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('1. Introduction', pad, y); y += 27;
  ctx.font = '15.5px Arial'; ctx.fillStyle = '#334155';
  y = wrapText(ctx, 'Recent advancements in artificial intelligence have transformed the way research is conducted across disciplines. The ability to analyze large-scale data, identify patterns, and generate novel insights has opened unprecedented possibilities for discovery.', pad, y, W - pad * 2, 22) + 18;

  ctx.font = 'bold 20px "Times New Roman", serif'; ctx.fillStyle = '#0f172a';
  ctx.fillText('2. Methodology', pad, y); y += 27;
  ctx.font = '15.5px Arial'; ctx.fillStyle = '#334155';
  wrapText(ctx, 'Our pipeline consists of four modules: data ingestion and preprocessing, feature extraction using transformer-based encoders, multi-task learning objective, and post-hoc interpretability via attention visualization techniques.', pad, y, W - pad * 2, 22);

  return new THREE.CanvasTexture(canvas);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number): number {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      y += lineH;
      line = word;
    } else { line = test; }
  }
  if (line) { ctx.fillText(line, x, y); y += lineH; }
  return y;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ─── Single paper mesh ────────────────────────────────────────────────────────
function Paper({ idx, total, texture }: { idx: number; total: number; texture: THREE.CanvasTexture }) {
  const isTop = idx === total - 1;

  // Stack: each paper sits a tiny bit behind and offset from the previous
  const zOffset = (total - 1 - idx) * 0.04;   // stack depth (back papers further in Z-)
  const fanRot   = ((idx - (total - 1) / 2) / total) * 0.04;  // subtle spread

  return (
    <group position={[0, 0, -zOffset]} rotation={[0, fanRot, 0]}>
      {/* White paper body */}
      <mesh castShadow receiveShadow>
        {/* Width=3, Height=4, Depth=0.025 — paper standing upright facing camera */}
        <boxGeometry args={[3, 4, 0.025]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.75} metalness={0} />
      </mesh>

      {/* Texture on front face (+Z) — only top paper shows text */}
      {isTop && (
        <mesh position={[0, 0, 0.013]}>
          <planeGeometry args={[3, 4]} />
          <meshStandardMaterial map={texture} roughness={0.8} metalness={0} transparent={false} />
        </mesh>
      )}
    </group>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function PaperStack() {
  const outerRef = useRef<THREE.Group>(null);
  const total = 6;
  const texture = useMemo(() => createPaperTexture(), []);

  useFrame((state) => {
    if (!outerRef.current) return;
    const t = state.clock.elapsedTime;
    // Gentle up/down float
    outerRef.current.position.y = Math.sin(t * 0.5) * 0.15;
    // Subtle yaw (left–right rock)
    outerRef.current.rotation.y = -0.15 + Math.sin(t * 0.3) * 0.04;
    // Tiny roll
    outerRef.current.rotation.z = Math.sin(t * 0.4) * 0.008;
  });

  return (
    /*
     * The group has a small X rotation (~-10°) and Y rotation (-15°) so the
     * camera at [0,0,9] sees the papers from a slightly elevated left angle —
     * matching the reference image's premium perspective.
     *
     * Critically: NO Math.PI here. Small angles only.
     */
    <group
      ref={outerRef}
      rotation={[-0.18, -0.22, 0.04]}   // ← the critical fix: ~10° X, ~13° Y
      scale={1.05}
    >
      {Array.from({ length: total }).map((_, i) => (
        <Paper key={i} idx={i} total={total} texture={texture} />
      ))}
    </group>
  );
}
