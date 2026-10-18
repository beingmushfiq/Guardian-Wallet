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

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Setup Scene, Camera, WebGLRenderer
    const scene = new THREE.Scene();
    const width = container.clientWidth || 340;
    const height = container.clientHeight || 192;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.6);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // Root interactive group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const isLightMode = () => document.documentElement.classList.contains('light');

    // Dynamic Theme and Status Palettes
    const getColors = (s: 'safe' | 'pending' | 'paused') => {
      const light = isLightMode();
      switch (s) {
        case 'paused':
          return {
            gem: light ? 0xe11d48 : 0xf43f5e,
            rings: light ? 0x94a3b8 : 0x334155,
            emissive: light ? 0xbe123c : 0xf43f5e,
            lightColor: light ? 0xf43f5e : 0xff4d6d,
            particles: light ? 0xf43f5e : 0xfb7185,
            seed: light ? 0xffffff : 0xff85a1,
            speed: 0.002,
          };
        case 'pending':
          return {
            gem: light ? 0xd97706 : 0xf59e0b,
            rings: light ? 0xa1a1aa : 0x475569,
            emissive: light ? 0xb45309 : 0xf59e0b,
            lightColor: light ? 0xf59e0b : 0xfcd34d,
            particles: light ? 0xd97706 : 0xfde68a,
            seed: light ? 0xffffff : 0xfef08a,
            speed: 0.015,
          };
        case 'safe':
        default:
          return {
            gem: light ? 0x059669 : 0x10b981,
            rings: light ? 0xa3a3a3 : 0x334155,
            emissive: light ? 0x047857 : 0x34d399,
            lightColor: light ? 0x10b981 : 0xc9f26b,
            particles: light ? 0x059669 : 0xa7f3d0,
            seed: light ? 0xffffff : 0xdcfce7,
            speed: 0.007,
          };
      }
    };

    let colors = getColors(statusRef.current);

    // 1. Central Cryptographic Gem (Multifaceted Translucent Crystal)
    const gemGeo = new THREE.OctahedronGeometry(0.88, 0);
    const gemMat = new THREE.MeshPhysicalMaterial({
      color: colors.gem,
      emissive: colors.emissive,
      emissiveIntensity: isLightMode() ? 0.3 : 0.65,
      roughness: 0.1,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.94,
      transmission: 0.2,
      ior: 1.5,
    });
    const gemMesh = new THREE.Mesh(gemGeo, gemMat);
    rootGroup.add(gemMesh);

    // 2. Inner Radiant Seed (Geometric Holographic Lattice)
    const seedGeo = new THREE.IcosahedronGeometry(0.42, 0);
    const seedMat = new THREE.MeshStandardMaterial({
      color: colors.seed,
      emissive: colors.lightColor,
      emissiveIntensity: isLightMode() ? 0.5 : 0.9,
      roughness: 0.2,
      metalness: 0.8,
    });
    const seedMesh = new THREE.Mesh(seedGeo, seedMat);
    gemMesh.add(seedMesh);

    // 3. Precision Concentric Gyroscopic Vault Rings
    const ringGroup1 = new THREE.Group();
    const ringGroup2 = new THREE.Group();
    const ringGroup3 = new THREE.Group();
    rootGroup.add(ringGroup1);
    rootGroup.add(ringGroup2);
    rootGroup.add(ringGroup3);

    // Outer Ring (Aerospace-grade polished gimbal)
    const outerRingGeo = new THREE.TorusGeometry(1.68, 0.042, 24, 72);
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: colors.rings,
      metalness: 0.95,
      roughness: 0.18,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    ringGroup1.add(outerRing);

    // Middle Ring (Tilted precision coordinate gimbal)
    const midRingGeo = new THREE.TorusGeometry(1.36, 0.035, 24, 72);
    const midRingMat = new THREE.MeshStandardMaterial({
      color: colors.rings,
      metalness: 0.92,
      roughness: 0.22,
    });
    const midRing = new THREE.Mesh(midRingGeo, midRingMat);
    ringGroup2.add(midRing);

    // Inner Equatorial Ring (High-speed stabilizer)
    const innerRingGeo = new THREE.TorusGeometry(1.08, 0.026, 20, 60);
    const innerRingMat = new THREE.MeshStandardMaterial({
      color: colors.rings,
      metalness: 0.9,
      roughness: 0.25,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    ringGroup3.add(innerRing);

    // Security Latches / Power Nodes on Outer Ring
    const nodeGeo = new THREE.SphereGeometry(0.075, 16, 16);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: colors.lightColor,
      emissive: colors.lightColor,
      emissiveIntensity: 0.9,
      metalness: 0.9,
      roughness: 0.1,
    });

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.set(Math.cos(angle) * 1.68, Math.sin(angle) * 1.68, 0);
      ringGroup1.add(node);
    }

    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.set(Math.cos(angle) * 1.36, Math.sin(angle) * 1.36, 0);
      ringGroup2.add(node);
    }

    // 4. Floating Holographic Security Particles
    const particleCount = 48;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = 1.85 + Math.random() * 0.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI;

      particlePositions[i * 3] = radius * Math.cos(theta) * Math.cos(phi);
      particlePositions[i * 3 + 1] = radius * Math.sin(phi);
      particlePositions[i * 3 + 2] = radius * Math.sin(theta) * Math.cos(phi);
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: colors.particles,
      size: 0.045,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    rootGroup.add(particles);

    // 5. Lighting Rig (Lustrous specular reflections)
    const ambientLight = new THREE.AmbientLight(0xffffff, isLightMode() ? 1.2 : 0.7);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(colors.lightColor, 2.8, 14);
    pointLight.position.set(2.5, 3.5, 3.5);
    scene.add(pointLight);

    const coreLight = new THREE.PointLight(colors.lightColor, 2.2, 7);
    coreLight.position.set(0, 0, 0);
    gemMesh.add(coreLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, isLightMode() ? 1.5 : 0.9);
    rimLight.position.set(-3, -2, -2.5);
    scene.add(rimLight);

    // Interactive Mouse Tracking and Tactile Pulse
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;
    let isHovered = false;
    let pulseScale = 1.0;
    let targetPulseScale = 1.0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotX = y * 0.32;
      targetRotY = x * 0.42;
    };

    const onPointerEnter = () => {
      isHovered = true;
    };

    const onPointerLeave = () => {
      isHovered = false;
      targetRotX = 0;
      targetRotY = 0;
    };

    const onPointerDown = () => {
      // Tactile vault lock engagement impulse
      targetPulseScale = 1.18;
      setTimeout(() => {
        targetPulseScale = 1.0;
      }, 160);
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('pointerenter', onPointerEnter);
    container.addEventListener('pointerleave', onPointerLeave);
    container.addEventListener('pointerdown', onPointerDown);

    // ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0 && renderer) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(container);

    // Theme Mutation Observer for instant switch
    const themeObserver = new MutationObserver(() => {
      const curColors = getColors(statusRef.current);
      colors = curColors;
      gemMat.color.setHex(colors.gem);
      gemMat.emissive.setHex(colors.emissive);
      gemMat.emissiveIntensity = isLightMode() ? 0.3 : 0.65;
      seedMat.color.setHex(colors.seed);
      seedMat.emissive.setHex(colors.lightColor);
      outerRingMat.color.setHex(colors.rings);
      midRingMat.color.setHex(colors.rings);
      innerRingMat.color.setHex(colors.rings);
      nodeMat.color.setHex(colors.lightColor);
      nodeMat.emissive.setHex(colors.lightColor);
      particleMat.color.setHex(colors.particles);
      pointLight.color.setHex(colors.lightColor);
      coreLight.color.setHex(colors.lightColor);
      ambientLight.intensity = isLightMode() ? 1.2 : 0.7;
      rimLight.intensity = isLightMode() ? 1.5 : 0.9;
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      // Check for status changes
      const curColors = getColors(statusRef.current);
      if (colors.gem !== curColors.gem) {
        colors = curColors;
        gemMat.color.setHex(colors.gem);
        gemMat.emissive.setHex(colors.emissive);
        seedMat.color.setHex(colors.seed);
        seedMat.emissive.setHex(colors.lightColor);
        outerRingMat.color.setHex(colors.rings);
        midRingMat.color.setHex(colors.rings);
        innerRingMat.color.setHex(colors.rings);
        nodeMat.color.setHex(colors.lightColor);
        nodeMat.emissive.setHex(colors.lightColor);
        particleMat.color.setHex(colors.particles);
        pointLight.color.setHex(colors.lightColor);
        coreLight.color.setHex(colors.lightColor);
      }

      if (!prefersReducedMotion) {
        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();
        const baseSpeed = isHovered ? colors.speed * 2.1 : colors.speed;

        // Smooth gyroscopic rotations on distinct axes
        gemMesh.rotation.y += baseSpeed * 1.3;
        gemMesh.rotation.x += baseSpeed * 0.5;

        seedMesh.rotation.y -= baseSpeed * 1.8;
        seedMesh.rotation.z += baseSpeed * 0.9;

        ringGroup1.rotation.z += baseSpeed * 1.1;
        ringGroup1.rotation.x = Math.sin(elapsedTime * 0.5) * 0.28;

        ringGroup2.rotation.z -= baseSpeed * 1.35;
        ringGroup2.rotation.y = Math.cos(elapsedTime * 0.45) * 0.32;

        ringGroup3.rotation.y += baseSpeed * 1.6;
        ringGroup3.rotation.z = Math.sin(elapsedTime * 0.7) * 0.2;

        particles.rotation.y += baseSpeed * 0.75;

        // Pulse scale spring damping
        pulseScale += (targetPulseScale - pulseScale) * 0.15;
        rootGroup.scale.set(pulseScale, pulseScale, pulseScale);

        // Gentle breathing pulsation on gem
        const breath = 1.0 + Math.sin(elapsedTime * 2.0) * 0.035;
        gemMesh.scale.set(breath, breath, breath);

        // Smooth cursor parallax lerp
        currentRotX += (targetRotX - currentRotX) * 0.08;
        currentRotY += (targetRotY - currentRotY) * 0.08;

        rootGroup.rotation.x = currentRotX;
        rootGroup.rotation.y = currentRotY + Math.sin(elapsedTime * 0.35) * 0.06;
      }

      if (renderer) {
        renderer.render(scene, camera);
      }
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerenter', onPointerEnter);
      container.removeEventListener('pointerleave', onPointerLeave);
      container.removeEventListener('pointerdown', onPointerDown);
      resizeObserver.disconnect();
      themeObserver.disconnect();

      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }

      // Dispose Geometries and Materials
      gemGeo.dispose();
      gemMat.dispose();
      seedGeo.dispose();
      seedMat.dispose();
      outerRingGeo.dispose();
      outerRingMat.dispose();
      midRingGeo.dispose();
      midRingMat.dispose();
      innerRingGeo.dispose();
      innerRingMat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative flex items-center justify-center overflow-hidden cursor-pointer select-none active:scale-[0.98] transition-transform ${className}`}
      title="Interactive 3D Vault Core · Click to test security locks · Move mouse to rotate"
      aria-hidden="true"
    />
  );
}
