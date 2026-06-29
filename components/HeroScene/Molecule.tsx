'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

const NODES: [number, number, number][] = [
  [0,    0,    0   ],
  [ 1.1, 0.7,  0.3 ],
  [-0.9,-0.6,  0.6 ],
  [ 0.3,-1.1, -0.5 ],
  [-0.7, 1.0, -0.3 ],
  [ 0.6, 0.2, -1.0 ],
];
const LINKS: [number, number][] = [[0,1],[0,2],[0,3],[0,4],[0,5],[1,4],[2,3]];

export default function Molecule(props: { basePosition?: [number, number, number], direction?: number, scaleFactor?: number }) {
  const { viewport } = useThree();
  const basePosition = props.basePosition || [3.8, -1.5, -1.5];
  const direction = props.direction || 1;
  const scaleFactor = props.scaleFactor || 0.61;
  const groupRef = useRef<THREE.Group>(null);

  const sphereMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#1a5fa8',
    metalness: 0.6,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    envMapIntensity: 3,
  }), []);

  const bondMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#60a5fa',
    metalness: 0.4,
    roughness: 0.3,
    transparent: true,
    opacity: 0.85,
  }), []);

  const bonds = useMemo(() => LINKS.map(([i, j]) => {
    const a = new THREE.Vector3(...NODES[i]);
    const b = new THREE.Vector3(...NODES[j]);
    return {
      dist: a.distanceTo(b),
      mid: a.clone().lerp(b, 0.5).toArray() as [number, number, number],
      q: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        b.clone().sub(a).normalize()
      ),
    };
  }), []);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      // Rotate on its own axis
      groupRef.current.rotation.y = t * 0.15;
      groupRef.current.rotation.x = t * 0.07;
      
      // Calculate the exact viewport width at the molecule's specific Z depth
      const currentViewport = state.viewport.getCurrentViewport(state.camera, new THREE.Vector3(0, 0, basePosition[2]));
      
      // The exact physical edge of the screen at this depth
      const screenEdge = currentViewport.width / 2;
      
      // Clamp the center of the orbit to stay strictly inside the visible screen
      // Subtracting 1.2 gives enough room for the 0.4 orbit + the molecule's physical size
      const maxAllowedX = Math.max(0, screenEdge - 1.2);
      const sign = Math.sign(basePosition[0]) || 1;
      const responsiveX = sign * Math.min(Math.abs(basePosition[0]), maxAllowedX);
      
      // Orbital motion around the perfectly clamped base position
      groupRef.current.position.x = responsiveX + Math.sin(t * 0.2 * direction) * 0.4;
      groupRef.current.position.z = basePosition[2] + Math.cos(t * 0.2 * direction) * 0.4;
      groupRef.current.position.y = basePosition[1] + Math.sin(t * 0.1 * direction) * 0.2;
    }
  });

  return (
    <Float speed={1.1} floatIntensity={0.2} rotationIntensity={0.05}>
      <group ref={groupRef} position={basePosition} scale={scaleFactor}>
        {NODES.map((pos, i) => (
          <mesh key={i} position={pos} material={sphereMat} castShadow>
            <sphereGeometry args={[i === 0 ? 0.36 : 0.19, 32, 32]} />
          </mesh>
        ))}
        {bonds.map(({ dist, mid, q }, i) => (
          <mesh key={i} position={mid} quaternion={q} material={bondMat}>
            <cylinderGeometry args={[0.028, 0.028, dist, 8]} />
          </mesh>
        ))}
      </group>
    </Float>
  );
}
