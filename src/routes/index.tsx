import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "808 LIVE — A Bolsa de Valores do seu Drink" },
      { name: "description", content: "Painel LED ao vivo de cotações de drinks. Trave seu preço antes que suba." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800;900&family=Rajdhani:wght@500;600;700&display=swap",
      },
    ],
  }),
  component: LedPanel,
});

type Drink = {
  id: string;
  name: string;
  price: number;
  base: number;
  trend: "up" | "down";
  status: string;
};

const INITIAL: Drink[] = [
  { id: "caip", name: "CAIPIRINHA", price: 18.5, base: 18.5, trend: "down", status: "DERRETENDO" },
  { id: "long", name: "LONG NECK", price: 14.0, base: 14.0, trend: "up", status: "EM ALTA" },
  { id: "vodka", name: "VODKA ENERGÉTICO", price: 24.0, base: 24.0, trend: "up", status: "EM ALTA" },
  { id: "neg", name: "NEGRONI", price: 32.0, base: 32.0, trend: "down", status: "DERRETENDO" },
];

function LedPanel() {
  const [drinks, setDrinks] = useState<Drink[]>(INITIAL);
  const [countdown, setCountdown] = useState(43);
  const [chart, setChart] = useState<number[]>(() =>
    Array.from({ length: 24 }, (_, i) => 90 - i * 2 + Math.random() * 6),
  );
  const [now, setNow] = useState(new Date());

  // Price oscillation
  useEffect(() => {
    const id = setInterval(() => {
      setDrinks((prev) =>
        prev.map((d) => {
          const drift = (Math.random() - 0.5) * 0.8;
          const next = Math.max(d.base * 0.7, Math.min(d.base * 1.3, d.price + drift));
          const trend: "up" | "down" = next >= d.price ? "up" : "down";
          return {
            ...d,
            price: Number(next.toFixed(2)),
            trend,
            status: trend === "up" ? "EM ALTA" : "DERRETENDO",
          };
        }),
      );
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // Countdown
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 59 : c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Chart melt
  useEffect(() => {
    const id = setInterval(() => {
      setChart((prev) => {
        const next = [...prev.slice(1), Math.max(8, prev[prev.length - 1] - 1 - Math.random() * 4)];
        if (next[next.length - 1] < 12) {
          return Array.from({ length: 24 }, (_, i) => 90 - i * 2 + Math.random() * 6);
        }
        return next;
      });
    }, 700);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const chartPath = useMemo(() => {
    const w = 100, h = 100;
    const step = w / (chart.length - 1);
    return chart.map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - v}`).join(" ");
  }, [chart]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Scanline overlay */}
      <div className="pointer-events-none absolute inset-0 scanlines z-50" />
      <div className="pointer-events-none absolute inset-0 z-40 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)]" />

      <div className="relative z-10 flex h-full flex-col p-4 gap-3">
        {/* HEADER */}
        <header className="panel-card rounded-lg px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-neon-red animate-blink-dot shadow-[0_0_15px_var(--neon-red)]" />
            <span className="font-display text-xs tracking-[0.3em] text-neon-cyan">LIVE</span>
          </div>
          <h1 className="font-display font-black text-2xl md:text-4xl tracking-[0.15em] text-center animate-neon-pulse text-neon-cyan">
            808 LIVE <span className="text-muted-foreground">|</span>{" "}
            <span className="text-glow-magenta text-neon-magenta">A BOLSA DE VALORES DO SEU DRINK</span>
          </h1>
          <div className="font-display text-neon-cyan text-glow-cyan text-lg tabular-nums">
            {now.toLocaleTimeString("pt-BR")}
          </div>
        </header>

        {/* MAIN GRID */}
        <section className="grid grid-cols-12 gap-3 flex-1 min-h-0">
          {/* LEFT - URGENCY CARD */}
          <div className="col-span-8 panel-card rounded-lg p-6 flex flex-col gap-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-magenta via-neon-red to-neon-magenta animate-blink-dot" />
            <div className="flex items-center justify-between">
              <span className="font-display tracking-[0.4em] text-xs text-neon-magenta text-glow-magenta">
                ★ DESTAQUE DO MOMENTO ★
              </span>
              <div className="flex items-center gap-2 font-display">
                <span className="text-xs tracking-widest text-muted-foreground">EXPIRA EM</span>
                <span className="text-3xl font-black text-neon-red text-glow-red tabular-nums animate-blink-dot">
                  00:{countdown.toString().padStart(2, "0")}
                </span>
              </div>
            </div>

            <h2 className="font-display font-black text-5xl md:text-6xl tracking-tight text-neon-cyan text-glow-cyan leading-none">
              GIN TÔNICA<br />
              <span className="text-neon-magenta text-glow-magenta">PREMIUM</span>
            </h2>

            <div className="flex items-end gap-6 mt-1">
              <div className="flex flex-col">
                <span className="font-body text-xs tracking-widest text-muted-foreground">DE</span>
                <span className="font-display text-3xl text-muted-foreground line-through decoration-neon-red decoration-2">
                  R$ 35,00
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-body text-xs tracking-widest text-neon-red text-glow-red">POR APENAS</span>
                <span className="font-display font-black text-7xl md:text-8xl text-neon-red animate-price-flash tabular-nums leading-none">
                  R$ 19,90
                </span>
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 mt-2 relative panel-card rounded-md p-3 min-h-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-display text-[10px] tracking-widest text-neon-cyan">PRICE MELT • LIVE FEED</span>
                <span className="font-display text-[10px] tracking-widest text-neon-red">▼ -43.14%</span>
              </div>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.65 0.3 25)" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="oklch(0.65 0.3 25)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[20, 40, 60, 80].map((y) => (
                  <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="oklch(0.25 0.08 270)" strokeWidth="0.2" />
                ))}
                <path d={`${chartPath} L 100 100 L 0 100 Z`} fill="url(#grad)" />
                <path
                  d={chartPath}
                  fill="none"
                  stroke="oklch(0.65 0.3 25)"
                  strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                  style={{ filter: "drop-shadow(0 0 6px oklch(0.65 0.3 25))" }}
                />
              </svg>
            </div>
          </div>

          {/* RIGHT - QUOTES */}
          <div className="col-span-4 panel-card rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-panel-border pb-2">
              <span className="font-display tracking-[0.3em] text-sm text-neon-cyan text-glow-cyan">COTAÇÕES</span>
              <span className="font-display text-[10px] tracking-widest text-muted-foreground flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan animate-blink-dot" />
                AO VIVO
              </span>
            </div>
            <div className="flex flex-col gap-2 flex-1">
              {drinks.map((d) => {
                const isDown = d.trend === "down";
                const color = isDown ? "text-neon-magenta" : "text-neon-blue";
                const glow = isDown ? "text-glow-magenta" : "text-glow-cyan";
                return (
                  <div
                    key={d.id}
                    className="panel-card rounded-md px-3 py-2 flex flex-col gap-1 flex-1 justify-center"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold tracking-wider text-sm text-foreground">
                        {d.name}
                      </span>
                      <span className={`font-display text-xl ${color} ${glow}`}>
                        {isDown ? "▼" : "▲"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`font-display font-black text-2xl tabular-nums ${color} ${glow}`}>
                        R$ {d.price.toFixed(2).replace(".", ",")}
                      </span>
                      <span
                        className={`font-display text-[10px] tracking-widest px-2 py-0.5 rounded-sm border ${
                          isDown
                            ? "border-neon-magenta text-neon-magenta"
                            : "border-neon-blue text-neon-blue"
                        }`}
                      >
                        {d.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="panel-card rounded-lg px-4 py-3 flex items-center gap-4 overflow-hidden">
          {/* QR */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-20 w-20 bg-white p-1.5 rounded-sm grid grid-cols-8 grid-rows-8 gap-0">
              {Array.from({ length: 64 }).map((_, i) => {
                // pseudo-random QR pattern
                const on = ((i * 31 + 7) % 5) > 1 || i < 8 || i % 8 === 0 || i % 8 === 7 || i > 55;
                const corner =
                  (i < 24 && i % 8 < 3) ||
                  (i < 24 && i % 8 > 4) ||
                  (i >= 40 && i % 8 < 3);
                return (
                  <div
                    key={i}
                    className={on || corner ? "bg-black" : "bg-white"}
                  />
                );
              })}
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-xl text-neon-cyan text-glow-cyan tracking-tight leading-tight">
                APONTE A CÂMERA
              </span>
              <span className="font-display font-bold text-lg text-neon-magenta text-glow-magenta tracking-tight leading-tight">
                TRAVE SEU PREÇO
              </span>
              <span className="font-body text-xs text-muted-foreground tracking-widest">
                ANTES QUE SUBA ↗
              </span>
            </div>
          </div>

          {/* Ticker */}
          <div className="flex-1 overflow-hidden border-l border-panel-border pl-4 h-full flex items-center">
            <div className="flex animate-ticker whitespace-nowrap gap-8 font-display tracking-widest text-sm">
              {[...drinks, ...drinks, ...drinks].map((d, i) => (
                <span key={i} className="flex items-center gap-2">
                  <span className="text-foreground">{d.name}</span>
                  <span className={d.trend === "down" ? "text-neon-magenta" : "text-neon-blue"}>
                    R$ {d.price.toFixed(2).replace(".", ",")}
                  </span>
                  <span className={d.trend === "down" ? "text-neon-magenta" : "text-neon-blue"}>
                    {d.trend === "down" ? "▼" : "▲"}
                  </span>
                  <span className="text-muted-foreground">•</span>
                </span>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
