import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  MeshTransmissionMaterial,
  Float,
  Stars,
  Environment,
  MeshDistortMaterial,
} from '@react-three/drei';
import * as THREE from 'three';

// ── Lightweight particle field ───────────────────────────────────────────────
function ParticleField() {
  const ref = useRef<THREE.Points>(null);
  const count = 200; // reduced from 350

  const { positions, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 26;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      const cyan = Math.random() > 0.45;
      col[i * 3]     = cyan ? 0.08 : 0.68;
      col[i * 3 + 1] = cyan ? 0.83 : 0.14;
      col[i * 3 + 2] = cyan ? 0.93 : 0.94;
    }
    return { positions: pos, colors: col };
  }, []);

  useFrame((s) => {
    if (ref.current) {
      ref.current.rotation.y = s.clock.elapsedTime * 0.01;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color"    args={[colors, 3]}    />
      </bufferGeometry>
      <pointsMaterial size={0.055} vertexColors transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

// ── Central glass torus-knot (OPTIMISED) ─────────────────────────────────────
function GlassKnot() {
  const meshRef  = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((s) => {
    const t = s.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.x = t * 0.16;
      meshRef.current.rotation.y = t * 0.20;
    }
    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x, s.mouse.x * 1.2, 0.04
      );
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y, s.mouse.y * 0.8, 0.04
      );
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={1.0} rotationIntensity={0.25} floatIntensity={1.2}>
        {/* Glass torus-knot — samples lowered to 4 for perf */}
        <mesh ref={meshRef}>
          <torusKnotGeometry args={[1.3, 0.38, 180, 24, 2, 3]} />
          <MeshTransmissionMaterial
            backside={false}        // false = much cheaper
            samples={4}             // was 16 → 4x faster
            resolution={256}        // was 512 → 4x cheaper
            transmission={0.97}
            roughness={0.0}
            thickness={0.45}
            ior={1.5}
            chromaticAberration={0.05}
            anisotropy={0.2}
            distortion={0.15}
            distortionScale={0.2}
            temporalDistortion={0.03}
            color="#c4eeff"
            attenuationColor="#8b5cf6"
            attenuationDistance={0.6}
          />
        </mesh>

        {/* Neon ring 1 */}
        <mesh rotation={[Math.PI / 2.5, 0, 0]}>
          <torusGeometry args={[2.4, 0.01, 6, 100]} />
          <meshStandardMaterial
            color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2.5}
            transparent opacity={0.7}
          />
        </mesh>

        {/* Neon ring 2 */}
        <mesh rotation={[0, Math.PI / 4, Math.PI / 3]}>
          <torusGeometry args={[2.8, 0.008, 6, 100]} />
          <meshStandardMaterial
            color="#a855f7" emissive="#a855f7" emissiveIntensity={2}
            transparent opacity={0.5}
          />
        </mesh>
      </Float>
    </group>
  );
}

// ── Orbiting gems (cheap standard material) ──────────────────────────────────
function OrbitingGems() {
  const groupRef = useRef<THREE.Group>(null);
  const gems = useMemo(() =>
    Array.from({ length: 7 }).map((_, i) => ({
      angle:   (i / 7) * Math.PI * 2,
      radius:  3.6 + (i % 2) * 0.4,
      color:   i % 3 === 0 ? '#22d3ee' : i % 3 === 1 ? '#a855f7' : '#ec4899',
      size:    0.10 + (i % 4) * 0.04,
      yOffset: Math.sin(i * 1.4) * 0.7,
    })), []);

  useFrame((s) => {
    if (groupRef.current)
      groupRef.current.rotation.y = s.clock.elapsedTime * 0.055;
  });

  return (
    <group ref={groupRef}>
      {gems.map((g, i) => (
        <mesh key={i} position={[Math.cos(g.angle) * g.radius, g.yOffset, Math.sin(g.angle) * g.radius]}>
          <icosahedronGeometry args={[g.size, 0]} />
          <meshStandardMaterial color={g.color} emissive={g.color} emissiveIntensity={3} roughness={0} metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// ── A FEW lightweight floating glass crystals ────────────────────────────────
function FloatingCrystals() {
  const crystals = useMemo(() =>
    Array.from({ length: 4 }).map((_, i) => ({   // 4 instead of 6
      pos: [
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 7,
        -4 - Math.random() * 3,
      ] as [number, number, number],
      size:  0.22 + Math.random() * 0.28,
      speed: 0.3 + Math.random() * 0.35,
      even:  i % 2 === 0,
    })), []);

  return (
    <>
      {crystals.map((c, i) => (
        <Float key={i} speed={c.speed} floatIntensity={0.9} rotationIntensity={0.7}>
          <mesh position={c.pos}>
            <octahedronGeometry args={[c.size, 0]} />
            <MeshTransmissionMaterial
              backside={false}
              samples={2}           // minimal
              resolution={128}
              transmission={0.93}
              roughness={0.02}
              thickness={0.25}
              ior={1.55}
              chromaticAberration={0.08}
              color={c.even ? '#c8f0ff' : '#e8d5ff'}
              attenuationColor={c.even ? '#0891b2' : '#7c3aed'}
              attenuationDistance={0.5}
            />
          </mesh>
        </Float>
      ))}
    </>
  );
}

// ── Distorted glowing core ────────────────────────────────────────────────────
function CoreSphere() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.07;
  });
  return (
    <mesh ref={ref} scale={0.42}>
      <sphereGeometry args={[1, 48, 48]} />   {/* reduced segments */}
      <MeshDistortMaterial
        color="#0c1e3d" attach="material"
        distort={0.45} speed={2.5}
        roughness={0} metalness={1}
        emissive="#1e40af" emissiveIntensity={0.55}
      />
    </mesh>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function Hero3D() {
  return (
    <div
      className="fixed inset-0 z-0 w-full h-full pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 50% 40%, #090f1e 0%, #03060e 55%, #000000 100%)',
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 11], fov: 42 }}
        dpr={[1, 1]}              // cap at 1× — biggest single perf win
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        frameloop="always"
      >
        <ambientLight intensity={0.12} />
        <pointLight position={[6, 6, 6]}   intensity={3.5} color="#22d3ee" />
        <pointLight position={[-6, -6, 4]} intensity={2.5} color="#a855f7" />
        <pointLight position={[0, 0, 8]}   intensity={1.2} color="#ffffff" />

        <Environment preset="night" />

        <Stars radius={90} depth={60} count={1800} factor={3} saturation={0} fade speed={0.3} />
        <ParticleField />
        <GlassKnot />
        <OrbitingGems />
        <FloatingCrystals />
        <CoreSphere />
      </Canvas>
    </div>
  );
}
