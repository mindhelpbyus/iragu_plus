import { useRef, useState, useEffect } from "react";
import { useMousePosition } from "./use-mouse-position";

type SpotlightProps = {
    className?: string;
    fill?: string;
};

export const Spotlight = ({ className = "", fill = "white" }: SpotlightProps) => {
    const divRef = useRef<HTMLDivElement>(null);
    const mousePosition = useMousePosition();
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    useEffect(() => {
        if (!divRef.current) return;
        const rect = divRef.current.getBoundingClientRect();
        setPosition({ x: mousePosition.x - rect.left, y: mousePosition.y - rect.top });
        setOpacity(1); // Always visible if tracking
    }, [mousePosition]);

    return (
        <div
            ref={divRef}
            className={`relative overflow-hidden ${className}`}
        >
            <div
                className="pointer-events-none absolute -inset-px transition duration-300"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${fill}, transparent 40%)`,
                }}
            />
        </div>
    );
};
