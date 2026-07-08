"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Slide = {
  src: string;
  name: string;
  ghost: string;
  bg: string;
  panel: string;
};

const SLIDES: Slide[] = [
  { src: "/images/arequipe.jpg", name: "Arequipe", ghost: "AREQUIPE", bg: "#c36b20", panel: "#d98a3f" },
  { src: "/images/mora.jpg", name: "Mora", ghost: "MORA", bg: "#7b3fa0", panel: "#9a5cc0" },
  { src: "/images/maracuya.jpg", name: "Maracuyá", ghost: "MARACUYA", bg: "#ff8a3d", panel: "#ffa869" },
  { src: "/images/oreo.jpg", name: "Oreo", ghost: "OREO", bg: "#3a2a20", panel: "#5a4234" },
  { src: "/images/limon.jpg", name: "Limón", ghost: "LIMON", bg: "#7c9a45", panel: "#98b566" },
  { src: "/images/leche-klim.png", name: "Leche Klim", ghost: "LECHE KLIM", bg: "#d9a441", panel: "#e8bd68" }
];

const COUNT = SLIDES.length;
const ANIM_MS = 650;
const EASE = "cubic-bezier(0.4,0,0.2,1)";

export default function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const animating = useRef(false);

  useEffect(() => {
    SLIDES.forEach((s) => {
      const img = new window.Image();
      img.src = s.src;
    });
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const navigate = useCallback((dir: "next" | "prev") => {
    if (animating.current) return;
    animating.current = true;
    setActiveIndex((prev) => (dir === "next" ? (prev + 1) % COUNT : (prev + COUNT - 1) % COUNT));
    window.setTimeout(() => {
      animating.current = false;
    }, ANIM_MS);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => navigate("next"), 4200);
    return () => window.clearInterval(id);
  }, [navigate]);

  const center = activeIndex;
  const left = (activeIndex + COUNT - 1) % COUNT;
  const right = (activeIndex + 1) % COUNT;
  const back = (activeIndex + 2) % COUNT;

  const roleStyle = (i: number): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: "absolute",
      aspectRatio: "0.62 / 1",
      transition: `transform ${ANIM_MS}ms ${EASE}, filter ${ANIM_MS}ms ${EASE}, opacity ${ANIM_MS}ms ${EASE}, left ${ANIM_MS}ms ${EASE}, bottom ${ANIM_MS}ms ${EASE}, height ${ANIM_MS}ms ${EASE}`,
      willChange: "transform, filter, opacity"
    };
    if (i === center)
      return { ...base, left: "50%", bottom: isMobile ? "22%" : "4%", height: isMobile ? "56%" : "84%", transform: `translateX(-50%) scale(${isMobile ? 1.18 : 1.5})`, filter: "none", opacity: 1, zIndex: 20 };
    if (i === left)
      return { ...base, left: isMobile ? "20%" : "30%", bottom: isMobile ? "32%" : "14%", height: isMobile ? "16%" : "28%", transform: "translateX(-50%) scale(1)", filter: "blur(2px)", opacity: 0.85, zIndex: 10 };
    if (i === right)
      return { ...base, left: isMobile ? "80%" : "70%", bottom: isMobile ? "32%" : "14%", height: isMobile ? "16%" : "28%", transform: "translateX(-50%) scale(1)", filter: "blur(2px)", opacity: 0.85, zIndex: 10 };
    if (i === back)
      return { ...base, left: "50%", bottom: isMobile ? "32%" : "14%", height: isMobile ? "13%" : "22%", transform: "translateX(-50%) scale(1)", filter: "blur(4px)", opacity: 1, zIndex: 5 };
    return { ...base, left: "50%", bottom: "14%", height: "0%", transform: "translateX(-50%) scale(0.6)", filter: "blur(6px)", opacity: 0, zIndex: 1 };
  };

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{
        backgroundColor: SLIDES[activeIndex].bg,
        transition: `background-color ${ANIM_MS}ms ${EASE}`,
        fontFamily: "var(--font-sans), Inter, sans-serif"
      }}
    >
      <div className="relative w-full" style={{ height: "100svh", overflow: "hidden" }}>
        {/* Grano */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            zIndex: 50,
            opacity: 0.4,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
            backgroundSize: "200px 200px"
          }}
        />

        {/* Texto fantasma gigante */}
        <div
          className="pointer-events-none absolute inset-x-0 flex select-none items-center justify-center"
          style={{ zIndex: 2, top: "16%" }}
        >
          <span
            className="uppercase text-white"
            style={{
              fontFamily: "var(--font-anton), sans-serif",
              fontSize: "clamp(72px, 26vw, 360px)",
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              whiteSpace: "nowrap",
              opacity: 0.95
            }}
          >
            {SLIDES[activeIndex].ghost}
          </span>
        </div>

        {/* Carrusel */}
        <div className="absolute inset-0" style={{ zIndex: 3 }}>
          {SLIDES.map((s, i) => (
            <div key={s.src} style={roleStyle(i)}>
              <div className="h-full w-full overflow-hidden rounded-[22px] shadow-[0_30px_70px_rgba(0,0,0,0.35)] ring-1 ring-white/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={s.src}
                  alt={s.name}
                  draggable={false}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Texto + navegación abajo-izquierda */}
        <div className="absolute bottom-6 left-4 sm:bottom-20 sm:left-24" style={{ zIndex: 60, maxWidth: 340 }}>
          <p
            className="mb-2 text-base font-bold uppercase tracking-widest text-white sm:mb-3 sm:text-[22px]"
            style={{ opacity: 0.95, letterSpacing: "0.02em" }}
          >
            {SLIDES[activeIndex].name}
          </p>
          <p className="mb-4 hidden text-xs leading-relaxed text-white sm:mb-5 sm:block sm:text-sm" style={{ opacity: 0.85, lineHeight: 1.6 }}>
            Postres caseros, cremosos y hechos con amor. Recién preparados, presentación premium y sabor que enamora. ¡Haz tu pedido ahora!
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => navigate("prev")}
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/90 text-white transition hover:scale-[1.08] hover:bg-white/12 sm:h-16 sm:w-16"
            >
              <ArrowLeft size={26} strokeWidth={2.25} />
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              onClick={() => navigate("next")}
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/90 text-white transition hover:scale-[1.08] hover:bg-white/12 sm:h-16 sm:w-16"
            >
              <ArrowRight size={26} strokeWidth={2.25} />
            </button>
          </div>
        </div>

        {/* Link abajo-derecha */}
        <a
          href="#pedido"
          className="absolute bottom-6 right-4 flex items-center uppercase text-white transition-opacity hover:opacity-100 sm:bottom-20 sm:right-10"
          style={{ zIndex: 60, fontFamily: "var(--font-anton), sans-serif", opacity: 0.95, letterSpacing: "-0.02em", lineHeight: 1 }}
        >
          <span style={{ fontSize: "clamp(20px, 4vw, 56px)" }}>Haz tu pedido</span>
          <ArrowRight className="ml-2 h-5 w-5 sm:h-8 sm:w-8" strokeWidth={2.25} />
        </a>
      </div>
    </section>
  );
}
