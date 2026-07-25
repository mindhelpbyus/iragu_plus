import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface FloatingShape {
    id: string;
    size: number;
    x: number;
    y: number;
    speed: number;
    color: string;
    opacity: number;
    blur: number;
    shape: 'circle' | 'square' | 'pill';
    rotation: number;
}

interface ParallaxAntiGravityProps {
    children: React.ReactNode;
    intensity?: number;
    enableMouse?: boolean;
    enableScroll?: boolean;
    shapes?: number;
    className?: string;
}

// Separate component to handle individual shape animation and follow hook rules
const FloatingShapeItem = ({
    shape,
    mouseX,
    mouseY,
    index
}: {
    shape: FloatingShape;
    mouseX: any;
    mouseY: any;
    index: number;
}) => {
    const ref = useRef<HTMLDivElement>(null);

    // Calculate repel force using useTransform
    // We approximate element position based on its percentage (shape.x/y)
    const x = useTransform([mouseX, mouseY], ([mx, my]: number[]) => {
        // Default large size to prevent divide by zero or weirdness if window undefined
        const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
        const elX = (shape.x / 100) * windowWidth;
        const dx = mx - elX;
        // In the vertical direction, standard parallax is usually top-down, but let's just use raw diff
        // We know shape.y is percentage of height
        const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;
        const elY = (shape.y / 100) * windowHeight;

        const dy = my - elY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 100; // Small radius

        if (dist < maxDist) {
            const force = (maxDist - dist) / maxDist;
            return -dx * force * 0.8; // Reduced strength
        }
        return 0;
    });

    const y = useTransform([mouseX, mouseY], ([mx, my]: number[]) => {
        const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;
        const elY = (shape.y / 100) * windowHeight;
        const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
        const elX = (shape.x / 100) * windowWidth;

        const dx = mx - elX;
        const dy = my - elY;

        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 100;

        if (dist < maxDist) {
            const force = (maxDist - dist) / maxDist;
            return -dy * force * 0.8;
        }
        return 0;
    });

    // Rotation based on movement to simulate "flow" or "magnetism"
    const rotate = useTransform(x, [-50, 50], [shape.rotation - 45, shape.rotation + 45]);

    // Generate random floating animation values for continuous movement
    const floatX = Math.sin(shape.rotation) * 30; // Use rotation as seed for variety
    const floatY = Math.cos(shape.rotation) * 30;
    const floatDuration = 3 + Math.random() * 4; // 3-7 seconds

    return (
        <motion.div
            ref={ref}
            className="absolute"
            style={{
                left: `${shape.x}%`,
                top: `${shape.y}%`,
                width: shape.size,
                height: shape.size,
                x,
                y,
                rotate,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
                opacity: shape.opacity,
                scale: [1, 1.1, 1], // Gentle pulsing
                x: [0, floatX, 0], // Continuous floating X
                y: [0, floatY, 0], // Continuous floating Y
            }}
            transition={{
                opacity: { duration: 1, delay: index * 0.02 },
                scale: {
                    duration: floatDuration,
                    repeat: Infinity,
                    ease: "easeInOut"
                },
                x: {
                    duration: floatDuration,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.05
                },
                y: {
                    duration: floatDuration * 1.2, // Slightly different duration for organic feel
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.03
                },
            }}
        >
            <div
                className={`w-full h-full ${shape.shape === 'circle'
                    ? 'rounded-full'
                    : shape.shape === 'pill'
                        ? 'rounded-full'
                        : 'rounded-lg'
                    }`}
                style={{
                    background: shape.color,
                    filter: `blur(${shape.blur}px)`,
                    transform: shape.shape === 'pill' ? 'scaleX(2)' : 'none',
                }}
            />
        </motion.div>
    );
};

export function ParallaxAntiGravity({
    children,
    enableMouse = true,
    enableScroll = true,
    shapes = 30,
    className = '',
}: ParallaxAntiGravityProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [floatingShapes, setFloatingShapes] = useState<FloatingShape[]>([]);

    // RAW Mouse position for physics calculations
    const rawMouseX = useMotionValue(-1000); // Start off-screen
    const rawMouseY = useMotionValue(-1000);

    // Smooth spring animation for mouse movement input
    const springConfig = { damping: 25, stiffness: 150 };
    const mouseX = useSpring(rawMouseX, springConfig);
    const mouseY = useSpring(rawMouseY, springConfig);

    // Generate shapes
    useEffect(() => {
        const colors = [
            'rgba(30, 112, 72, 0.8)',  // Bright orange - high opacity
            'rgba(245, 158, 11, 0.7)',  // Amber - high opacity
            'rgba(20, 92, 52, 0.8)',   // Dark orange - high opacity
            'rgba(251, 146, 60, 0.6)',  // Light orange
        ];
        const shapeTypes: Array<'circle' | 'square' | 'pill'> = ['circle', 'circle', 'circle', 'circle']; // All circles

        const newShapes: FloatingShape[] = Array.from({ length: 120 }, (_, i) => ({
            id: `shape-${i}`,
            size: Math.random() * 30 + 30, // Larger: 30-60px
            x: Math.random() * 100, // %
            y: Math.random() * 100, // %
            speed: Math.random() * 0.5 + 0.2,
            color: colors[Math.floor(Math.random() * colors.length)],
            opacity: Math.random() * 0.3 + 0.6, // Higher opacity: 0.6-0.9
            blur: Math.random() * 1, // Less blur for crisp dots
            shape: shapeTypes[Math.floor(Math.random() * shapeTypes.length)],
            rotation: Math.random() * 360,
        }));
        setFloatingShapes(newShapes);
    }, [shapes]);

    // Handle mouse move - CAPTURE RAW PIXEL COORDS
    useEffect(() => {
        if (!enableMouse) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            // Store coordinates relative to the container (which covers the screen usually)
            rawMouseX.set(e.clientX - rect.left);
            rawMouseY.set(e.clientY - rect.top);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [enableMouse, rawMouseX, rawMouseY]);

    // Handle scroll parallax (simple vertical shift)
    useEffect(() => {
        if (!enableScroll) return;

        const handleScroll = () => {
            const scrollY = window.scrollY;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            const scrollProgress = maxScroll > 0 ? scrollY / maxScroll : 0;

            setFloatingShapes(prev =>
                prev.map(shape => ({
                    ...shape,
                    y: (shape.y + scrollProgress * 5) % 100,
                }))
            );
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [enableScroll]);

    return (
        <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
            {/* Floating shapes background layer - oversized to allow parallax movement without clipping */}
            <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] pointer-events-none overflow-hidden">
                {floatingShapes.map((shape, index) => (
                    <FloatingShapeItem
                        key={shape.id}
                        shape={shape}
                        mouseX={mouseX}
                        mouseY={mouseY}
                        index={index}
                    />
                ))}
            </div>

            {/* Main content */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>
        </div>
    );
}

// Additional components preserved if any
// ParallaxSection etc
interface FloatingElementProps {
    children: React.ReactNode;
    depth?: number;
    className?: string;
    delay?: number;
}
export function FloatingElement({
    children,
    depth = 0.5,
    className = '',
    delay = 0,
}: FloatingElementProps) {
    const ref = useRef<HTMLDivElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    const springConfig = { damping: 25, stiffness: 150 };
    const x = useSpring(mouseX, springConfig);
    const y = useSpring(mouseY, springConfig);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!ref.current) return;
            const rect = ref.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const deltaX = (e.clientX - centerX) * depth * 0.05;
            const deltaY = (e.clientY - centerY) * depth * 0.05;
            mouseX.set(deltaX);
            mouseY.set(deltaY);
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [depth, mouseX, mouseY]);

    return (
        <motion.div
            ref={ref}
            className={className}
            style={{ x, y }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay, type: 'spring' }}
            whileHover={{ scale: 1.02 }}
        >
            {children}
        </motion.div>
    );
}
