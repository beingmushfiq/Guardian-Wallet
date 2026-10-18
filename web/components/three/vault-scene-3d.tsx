'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface VaultScene3DProps {
  status?: 'safe' | 'pending' | 'paused';
  className?: string;
}

export function VaultScene3D({ status = 'safe', className = '' }: VaultScene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 180;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 6;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch {
      return; // WebGL not supported, fallback cleanly
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group for mouse tilt
    const group = new THREE.Group();
    scene.add(group);

    // Colors mapping
    const isLightMode = () => document.documentElement.classList.contains('light');

    // Colors mapping (WCAG AA adapted for both dark and light modes)
    const getColors = (s: 'safe' | 'pending' | 'paused') => {
      const light = isLightMode();
      switch (s) {
        case 'paused':
          return {
            primary: light ? 0xbe123c : 0xf43f5e,
            secondary: light ? 0x9f1239 : 0xbe123c,
            glow: light ? 0xe11d48 : 0xff6b81,
            speed: 0.002,
          };
        case 'pending':
          return {
            primary: light ? 0xb45309 : 0xf59e0b,
            secondary: light ? 0x92400e : 0xd97706,
            glow: light ? 0xd97706 : 0xfcd34d,
            speed: 0.02,
          };
        case 'safe':
        default:
          return {
            primary: light ? 0x15803d : 0xc9f26b,
            secondary: light ? 0x047857 : 0x10b981,
            glow: light ? 0x16a34a : 0x7ee7c0,
            speed: 0.008,
          };
      }
    };

    let colors = getColors(statusRef.current);

    // Outer Wireframe Polyhedron
    const outerGeo = new THREE.IcosahedronGeometry(1.9, 1);
    const outerMat = new THREE.MeshStandardMaterial({
      color: colors.primary,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
      roughness: 0.2,
      metalness: 0.8,
    });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    group.add(outerMesh);

    // Middle Crystalline Faceted Shell
    const midGeo = new THREE.DodecahedronGeometry(1.4);
    const midMat = new THREE.MeshPhysicalMaterial({
      color: colors.secondary,
      roughness: 0.1,
      metalness: 0.6,
      transparent: true,
      opacity: 0.35,
      transmission: 0.4,
      wireframe: false,
    });
    const midMesh = new THREE.Mesh(midGeo, midMat);
    group.add(midMesh);

    // Inner Glowing Cryptographic Core (Octahedron)
    const coreGeo = new THREE.OctahedronGeometry(0.85);
    const coreMat = new THREE.MeshStandardMaterial({
      color: colors.glow,
      emissive: colors.primary,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.9,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // Orbiting Particles Ring
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const theta = (i / particleCount) * Math.PI * 2;
      const radius = 2.4 + (Math.random() - 0.5) * 0.4;
      particlePositions[i * 3] = Math.cos(theta) * radius;
      particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
      particlePositions[i * 3 + 2] = Math.sin(theta) * radius;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: colors.primary,
      size: 0.06,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    group.add(particles);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(colors.primary, 3, 15);
    pointLight.position.set(3, 4, 3);
    scene.add(pointLight);

    const backLight = new THREE.PointLight(colors.glow, 2, 10);
    backLight.position.set(-3, -2, -2);
    scene.add(backLight);

    // Mouse tilt tracking
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetX = x * 0.4;
      targetY = y * 0.4;
    };

    container.addEventListener('pointermove', onPointerMove);

    // Resize handling with ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        if (newWidth > 0 && newHeight > 0 && renderer) {
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        }
      }
    });
    resizeObserver.observe(container);

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Dynamically update colors if status changes
      const currentColors = getColors(statusRef.current);
      if (colors.primary !== currentColors.primary) {
        colors = currentColors;
        outerMat.color.setHex(colors.primary);
        midMat.color.setHex(colors.secondary);
        coreMat.color.setHex(colors.glow);
        coreMat.emissive.setHex(colors.primary);
        particleMat.color.setHex(colors.primary);
        pointLight.color.setHex(colors.primary);
        backLight.color.setHex(colors.glow);
      }

      if (!prefersReducedMotion) {
        const delta = clock.getDelta();
        // Rotation
        outerMesh.rotation.x += colors.speed * 0.7;
        outerMesh.rotation.y += colors.speed;

        midMesh.rotation.x -= colors.speed * 0.9;
        midMesh.rotation.y += colors.speed * 0.5;

        coreMesh.rotation.y -= colors.speed * 1.5;
        coreMesh.rotation.z += colors.speed * 0.6;

        particles.rotation.y += colors.speed * 1.2;
        particles.rotation.x = Math.sin(clock.getElapsedTime() * 0.5) * 0.15;

        // Smooth cursor tilt lerp
        currentX += (targetX - currentX) * 0.08;
        currentY += (targetY - currentY) * 0.08;

        group.rotation.y = currentX + Math.sin(clock.getElapsedTime() * 0.3) * 0.1;
        group.rotation.x = -currentY;
      }

      if (renderer) {
        renderer.render(scene, camera);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('pointermove', onPointerMove);
      resizeObserver.disconnect();

      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }

      // Dispose geometries and materials
      outerGeo.dispose();
      outerMat.dispose();
      midGeo.dispose();
      midMat.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center overflow-hidden ${className}`}
      aria-hidden="true"
    />
  );
}
