import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface MockupViewer3DProps {
  frontDesign?: string;
  backDesign?: string;
  productType: string;
}

function TShirtModel({ frontTexture, backTexture }: { frontTexture?: THREE.Texture; backTexture?: THREE.Texture }) {
  const meshRef = useRef<THREE.Mesh>(null);

  return (
    <group>
      {/* Front of T-shirt */}
      <mesh position={[0, 0, 0.05]}>
        <planeGeometry args={[2, 2.5]} />
        {frontTexture ? (
          <meshStandardMaterial map={frontTexture} />
        ) : (
          <meshStandardMaterial color="#ffffff" />
        )}
      </mesh>
      
      {/* Back of T-shirt */}
      <mesh position={[0, 0, -0.05]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[2, 2.5]} />
        {backTexture ? (
          <meshStandardMaterial map={backTexture} />
        ) : (
          <meshStandardMaterial color="#f0f0f0" />
        )}
      </mesh>

      {/* T-shirt outline/body */}
      <mesh ref={meshRef}>
        <boxGeometry args={[2, 2.5, 0.1]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

export default function MockupViewer3D({ frontDesign, backDesign, productType }: MockupViewer3DProps) {
  const [frontTexture, setFrontTexture] = useState<THREE.Texture>();
  const [backTexture, setBackTexture] = useState<THREE.Texture>();

  useEffect(() => {
    if (frontDesign) {
      const loader = new THREE.TextureLoader();
      loader.load(frontDesign, (texture) => {
        setFrontTexture(texture);
      });
    }
  }, [frontDesign]);

  useEffect(() => {
    if (backDesign) {
      const loader = new THREE.TextureLoader();
      loader.load(backDesign, (texture) => {
        setBackTexture(texture);
      });
    }
  }, [backDesign]);

  return (
    <div className="w-full h-[500px] bg-gray-100 rounded-lg overflow-hidden">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} />
        
        <TShirtModel frontTexture={frontTexture} backTexture={backTexture} />
        
        <OrbitControls 
          enableZoom={true}
          enablePan={true}
          minDistance={3}
          maxDistance={8}
        />
      </Canvas>
      
      <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded text-sm">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
}
