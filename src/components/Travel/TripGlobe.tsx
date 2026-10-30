import { useEffect, useRef } from "react";
import createGlobe from "cobe";
import { useTheme } from "next-themes";
import type { TripLocationPin } from "@/types/travel";

const TWO_PI = Math.PI * 2;
const PIN_COLOR: [number, number, number] = [0.1, 0.72, 0.5];
const FOCUS_COLOR: [number, number, number] = [0.96, 0.45, 0.12];

// cobe's phi/theta that put a lat/lng at the front of the globe
function locationToAngles(lat: number, lng: number): [number, number] {
  return [Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180];
}

interface TripGlobeProps {
  pins: TripLocationPin[];
  focusedId: string | null;
}

export function TripGlobe({ pins, focusedId }: TripGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phiRef = useRef(0);
  const thetaRef = useRef(0.3);
  const targetRef = useRef<[number, number] | null>(null);
  const dragRef = useRef<{ x: number; phi: number } | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const focused = pins.find((p) => p.event_id === focusedId) ?? null;

  useEffect(() => {
    targetRef.current = focused ? locationToAngles(focused.latitude, focused.longitude) : null;
  }, [focused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = canvas.offsetWidth;
    const onResize = () => {
      width = canvas.offsetWidth;
    };
    window.addEventListener("resize", onResize);

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: isDark ? 1 : 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: isDark ? 6 : 1.2,
      baseColor: isDark ? [0.3, 0.3, 0.34] : [1, 1, 1],
      markerColor: PIN_COLOR,
      glowColor: isDark ? [0.16, 0.16, 0.2] : [0.88, 0.9, 0.95],
      markers: pins.map((p) => {
        const isFocused = p.event_id === focusedId;
        return {
          location: [p.latitude, p.longitude] as [number, number],
          size: isFocused ? 0.1 : 0.045,
          color: isFocused ? FOCUS_COLOR : PIN_COLOR,
        };
      }),
      onRender: (state) => {
        const target = targetRef.current;
        if (!dragRef.current) {
          if (target) {
            // Ease toward the focused trip along the shortest way around
            let d = (target[0] - phiRef.current) % TWO_PI;
            if (d > Math.PI) d -= TWO_PI;
            if (d < -Math.PI) d += TWO_PI;
            phiRef.current += d * 0.08;
            thetaRef.current += (target[1] - thetaRef.current) * 0.08;
          } else if (!reduceMotion) {
            phiRef.current += 0.003;
          }
        }
        state.phi = phiRef.current;
        state.theta = thetaRef.current;
        state.width = width * 2;
        state.height = width * 2;
      },
    });

    return () => {
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [pins, focusedId, isDark]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={
        focused
          ? `Globe showing ${pins.length} trip destinations, centered on ${focused.place}`
          : `Globe showing ${pins.length} trip destinations`
      }
      className="w-full aspect-square max-w-[420px] mx-auto cursor-grab active:cursor-grabbing touch-none"
      onPointerDown={(e) => {
        dragRef.current = { x: e.clientX, phi: phiRef.current };
        targetRef.current = null;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (dragRef.current) {
          phiRef.current = dragRef.current.phi + (e.clientX - dragRef.current.x) / 150;
        }
      }}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
    />
  );
}
