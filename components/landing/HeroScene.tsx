"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function HeroScene() {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        // ─── Renderer ──────────────────────────────────────────────────
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        mount.appendChild(renderer.domElement);

        // ─── Scene / Camera ────────────────────────────────────────────
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(55, mount.clientWidth / mount.clientHeight, 0.1, 200);
        camera.position.set(0, 0, 6);

        // ─── Lighting ──────────────────────────────────────────────────
        scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const purpleLight = new THREE.PointLight(0x9d7fea, 2.5, 20);
        purpleLight.position.set(0, 0, 3);
        scene.add(purpleLight);
        const blueLight = new THREE.PointLight(0x6e56cf, 0.8, 20);
        blueLight.position.set(4, 4, 2);
        scene.add(blueLight);
        const softLight = new THREE.PointLight(0xc4b0ff, 0.5, 20);
        softLight.position.set(-4, -2, 2);
        scene.add(softLight);

        // ─── AI Orb ───────────────────────────────────────────────────
        const orbGeo = new THREE.IcosahedronGeometry(1.1, 10);
        const orbMat = new THREE.MeshStandardMaterial({
            color: 0x6e56cf,
            emissive: 0x9d7fea,
            emissiveIntensity: 0.8,
            roughness: 0.15,
            metalness: 0.7,
        });
        const orb = new THREE.Mesh(orbGeo, orbMat);
        scene.add(orb);

        // Outer glow shell
        const glowGeo = new THREE.IcosahedronGeometry(1.1, 5);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x9d7fea,
            transparent: true,
            opacity: 0.06,
            side: THREE.BackSide,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.scale.setScalar(1.22);
        scene.add(glow);

        // ─── Orbital Rings ────────────────────────────────────────────
        const ringData = [
            { radius: 2.0, tube: 0.012, color: 0x6e56cf, opacity: 0.55, rx: Math.PI / 2.2, ry: 0.4, rz: 0 },
            { radius: 2.6, tube: 0.009, color: 0x9d7fea, opacity: 0.35, rx: 0.6, ry: Math.PI / 5, rz: 0.3 },
            { radius: 3.2, tube: 0.007, color: 0xc4b0ff, opacity: 0.2, rx: 1.1, ry: 0.9, rz: 0.5 },
        ];
        const rings = ringData.map(({ radius, tube, color, opacity, rx, ry, rz }) => {
            const mesh = new THREE.Mesh(
                new THREE.TorusGeometry(radius, tube, 16, 100),
                new THREE.MeshBasicMaterial({ color, transparent: true, opacity })
            );
            mesh.rotation.set(rx, ry, rz);
            scene.add(mesh);
            return mesh;
        });

        // ─── Particle Field ───────────────────────────────────────────
        const COUNT = 2200;
        const positions = new Float32Array(COUNT * 3);
        for (let i = 0; i < COUNT; i++) {
            positions[i * 3 + 0] = (Math.random() - 0.5) * 18;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;
        }
        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const particles = new THREE.Points(
            particleGeo,
            new THREE.PointsMaterial({ color: 0x9d7fea, size: 0.045, sizeAttenuation: true, transparent: true, opacity: 0.65, depthWrite: false })
        );
        scene.add(particles);

        // ─── Stars ────────────────────────────────────────────────────
        const starCount = 3000;
        const starPos = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            starPos[i * 3 + 0] = (Math.random() - 0.5) * 160;
            starPos[i * 3 + 1] = (Math.random() - 0.5) * 160;
            starPos[i * 3 + 2] = (Math.random() - 0.5) * 80 - 20;
        }
        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
        const stars = new THREE.Points(
            starGeo,
            new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.5 })
        );
        scene.add(stars);

        // ─── Grid Floor ───────────────────────────────────────────────
        const gridHelper = new THREE.GridHelper(30, 30, 0x2a2d35, 0x1c1f26);
        gridHelper.position.y = -3.5;
        scene.add(gridHelper);

        // ─── Mouse parallax ───────────────────────────────────────────
        let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
        const onMouseMove = (e: MouseEvent) => {
            targetX = (e.clientX / window.innerWidth) * 2 - 1;
            targetY = -((e.clientY / window.innerHeight) * 2 - 1);
        };
        window.addEventListener("mousemove", onMouseMove);

        // ─── Resize ───────────────────────────────────────────────────
        const onResize = () => {
            if (!mount) return;
            camera.aspect = mount.clientWidth / mount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mount.clientWidth, mount.clientHeight);
        };
        window.addEventListener("resize", onResize);

        // ─── Animation Loop ───────────────────────────────────────────
        const clock = new THREE.Clock();
        let animId: number;

        const animate = () => {
            animId = requestAnimationFrame(animate);
            const t = clock.getElapsedTime();
            const delta = clock.getDelta();

            // Orb
            orb.rotation.y += 0.003;
            orb.rotation.x = Math.sin(t * 0.4) * 0.15;
            orb.position.y = Math.sin(t * 0.8) * 0.12;
            glow.rotation.copy(orb.rotation);
            glow.position.copy(orb.position);
            orbMat.emissiveIntensity = 0.6 + Math.sin(t * 1.2) * 0.3;

            // Rings
            rings[0].rotation.z += 0.0025;
            rings[1].rotation.x += 0.0018;
            rings[2].rotation.y += 0.0012;
            rings[2].rotation.z -= 0.0008;

            // Particles
            particles.rotation.y = t * 0.015 + currentX * 0.04;
            particles.rotation.x = currentY * 0.025;

            // Grid scroll
            gridHelper.position.z -= 0.003;
            if (gridHelper.position.z < -2) gridHelper.position.z = 0;

            // Camera parallax
            currentX += (targetX * 0.6 - currentX) * 0.05;
            currentY += (targetY * 0.4 - currentY) * 0.05;
            camera.position.x = currentX;
            camera.position.y = currentY;
            camera.lookAt(0, 0, 0);

            renderer.render(scene, camera);
        };

        animate();

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("resize", onResize);
            renderer.dispose();
            if (mount.contains(renderer.domElement)) {
                mount.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div
            ref={mountRef}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />
    );
}
