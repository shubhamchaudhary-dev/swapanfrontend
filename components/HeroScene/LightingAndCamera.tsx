'use client';

import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const _cam = new THREE.Vector3();

export default function LightingAndCamera() {
  const { camera, pointer } = useThree();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Gentle cinematic idle — almost imperceptible
    const idleX =  Math.sin(t * 0.15) * 0.12;
    const idleY =  Math.cos(t * 0.10) * 0.07;

    // Mouse parallax is very subtle (max ~4px equivalent)
    _cam.set(
      idleX + pointer.x * 0.2,
      0.5  + idleY + pointer.y * 0.12,
      12
    );
    camera.position.lerp(_cam, 0.03);
    camera.lookAt(0, 0, 0);
  });

  return (
    <>
      {/* Soft global fill */}
      <ambientLight intensity={0.6} />

      {/* Key light — bright, slightly off-center right */}
      <directionalLight
        position={[6, 10, 10]}
        intensity={2.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      {/* Cool blue rim — wraps the papers from behind-left */}
      <spotLight
        position={[-10, 5, -4]}
        intensity={6}
        color="#3b82f6"
        penumbra={1}
        angle={0.5}
      />

      {/* Warm subtle fill from front-bottom-right */}
      <pointLight position={[5, -4, 6]} intensity={1.8} color="#dbeafe" />

      {/* Deep blue back glow for atmospheric depth */}
      <pointLight position={[-4, 2, -6]} intensity={1.2} color="#1d4ed8" />

      {/* Left side glow — lights up the text area too */}
      <pointLight position={[-8, 0, 2]} intensity={0.8} color="#60a5fa" />
    </>
  );
}
