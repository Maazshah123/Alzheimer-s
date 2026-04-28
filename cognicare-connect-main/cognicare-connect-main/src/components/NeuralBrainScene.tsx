import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, Icosahedron, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";

// Animated neural network nodes orbiting a distorted core
function NeuralNodes({ count = 80 }: { count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const phi = Math.acos(-1 + (2 * i) / count);
        const theta = Math.sqrt(count * Math.PI) * phi;
        return {
          phi,
          theta,
          radius: 2.4 + Math.random() * 0.6,
          speed: 0.15 + Math.random() * 0.25,
          offset: Math.random() * Math.PI * 2,
        };
      }),
    [count]
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    data.forEach((d, i) => {
      const r = d.radius + Math.sin(t * d.speed + d.offset) * 0.15;
      const phi = d.phi + Math.sin(t * 0.1) * 0.05;
      const theta = d.theta + t * d.speed * 0.3;
      dummy.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta)
      );
      const s = 0.04 + Math.sin(t * 2 + i) * 0.015;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshStandardMaterial
        color="#7be3d4"
        emissive="#2dd4bf"
        emissiveIntensity={1.4}
        roughness={0.3}
        metalness={0.6}
      />
    </instancedMesh>
  );
}

// Connecting lines that pulse
function NeuralLines() {
  const ref = useRef<THREE.LineSegments>(null!);
  const positions = useMemo(() => {
    const arr: number[] = [];
    const N = 28;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const b = ((i + 7) / N) * Math.PI * 2;
      arr.push(
        Math.cos(a) * 2.6, Math.sin(a) * 2.6, 0,
        Math.cos(b) * 2.6, Math.sin(b) * 2.6, 0
      );
    }
    return new Float32Array(arr);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    ref.current.rotation.z = t * 0.08;
    ref.current.rotation.x = Math.sin(t * 0.2) * 0.4;
    ref.current.rotation.y = t * 0.12;
    const mat = ref.current.material as THREE.LineBasicMaterial;
    mat.opacity = 0.25 + Math.sin(t * 1.5) * 0.15;
  });

  return (
    <lineSegments ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#5eead4" transparent opacity={0.35} />
    </lineSegments>
  );
}

// Distorted brain-like core
function BrainCore() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.15;
    ref.current.rotation.x = Math.sin(t * 0.3) * 0.2;
  });
  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
      <Sphere ref={ref} args={[1.4, 128, 128]}>
        <MeshDistortMaterial
          color="#0d9488"
          emissive="#14b8a6"
          emissiveIntensity={0.4}
          roughness={0.15}
          metalness={0.8}
          distort={0.45}
          speed={1.6}
        />
      </Sphere>
    </Float>
  );
}

// Outer wireframe shell suggesting AR space
function ARShell() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    ref.current.rotation.x = t * 0.05;
    ref.current.rotation.y = -t * 0.07;
  });
  return (
    <Icosahedron ref={ref} args={[3.2, 1]}>
      <meshBasicMaterial color="#5eead4" wireframe transparent opacity={0.18} />
    </Icosahedron>
  );
}

interface Props {
  className?: string;
}

const NeuralBrainScene = ({ className }: Props) => {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={1.2} color="#7dd3fc" />
        <pointLight position={[-5, -3, 2]} intensity={1} color="#fbbf24" />
        <directionalLight position={[0, 5, 5]} intensity={0.6} />

        <BrainCore />
        <NeuralNodes count={90} />
        <NeuralLines />
        <ARShell />

        <Environment preset="city" />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.6}
          rotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
};

export default NeuralBrainScene;
