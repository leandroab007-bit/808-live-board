import { useEffect, useMemo, useState } from "react";
import { useMarket } from "./marketStore";

export function PublicScreen() {
  const { drinks: allDrinks, bolsa, marketPaused } = useMarket();
  const drinks = useMemo(() => allDrinks.filter((d) => !d.paused), [allDrinks]);

  const [countdown, setCountdown] = useState(43);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setCountdown((c) => (c <= 1 ? 59 : c - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // hero = drink com maior desconto vs original
  const hero =
    drinks
      .map((d) => ({ d, discount: 1 - d.price / d.original }))
      .sort((a, b) => b.discount - a.discount)[0]?.d ?? allDrinks[0];

  // sparkline a partir do histórico real do hero
  const chart = hero?.history ?? [];
  const chartPath = useMemo(() => {
    if (!chart.length) return "";
    const w = 100, h = 100;
    const min = Math.min(...chart);
    const max = Math.max(...chart);
    const range = max - min || 1;
    const step = w / (chart.length - 1);
    return chart
      .map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - ((v - min) / range) * h}`)
      .join(" ");
  }, [chart]);

  const fmt = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;
  const heroDiscount = hero ? Math.round((1 - hero.price / hero.original) * 100) : 0;

  return (
    <main className="relative h-full w-full overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 scanlines z-50" />
      <div className="pointer-events-none absolute inset-0 z-40 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)]" />

      <div className="relative z-10 flex h-full flex-col p-4 gap-3">
        <header className="panel-card rounded-lg px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full animate-blink-dot ${
              !bolsa.open || marketPaused ? "bg-neon-red shadow-[0_0_15px_var(--neon-red)]" : "bg-neon-lime shadow-[0_0_15px_var(--neon-lime)]"
            }`} />
            <span className="font-display text-xs tracking-[0.3em] text-neon-cyan">
              {!bolsa.open ? "FECHADO" : marketPaused ? "PAUSADO" : "LIVE"}
            </span>
          </div>
          <h1 className="font-display font-black text-2xl md:text-4xl tracking-[0.15em] text-center animate-neon-pulse text-neon-cyan">
            808 LIVE <span className="text-muted-foreground">|</span>{" "}
            <span className="text-glow-magenta text-neon-magenta">A BOLSA DE VALORES DO SEU DRINK</span>
          </h1>
          <div className="font-display text-neon-cyan text-glow-cyan text-lg tabular-nums">
            {now.toLocaleTimeString("pt-BR")}
          </div>
        </header>

        <section className="grid grid-cols-12 gap-3 flex-1 min-h-0">
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

            {hero && (
              <>
                <h2 className="font-display font-black text-5xl md:text-6xl tracking-tight text-neon-cyan text-glow-cyan leading-none">
                  {hero.emoji} {hero.name}
                </h2>

                <div className="flex items-end gap-6 mt-1">
                  <div className="flex flex-col">
                    <span className="font-body text-xs tracking-widest text-muted-foreground">DE</span>
                    <span className="font-display text-3xl text-muted-foreground line-through decoration-neon-red decoration-2">
                      {fmt(hero.original)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-body text-xs tracking-widest text-neon-red text-glow-red">POR APENAS</span>
                    <span className="font-display font-black text-7xl md:text-8xl text-neon-red animate-price-flash tabular-nums leading-none">
                      {fmt(hero.price)}
                    </span>
                  </div>
                  {heroDiscount > 0 && (
                    <span className="font-display font-black text-2xl text-neon-lime text-glow-lime self-end">
                      -{heroDiscount}%
                    </span>
                  )}
                </div>
              </>
            )}

            <div className="flex-1 mt-2 relative panel-card rounded-md p-3 min-h-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-display text-[10px] tracking-widest text-neon-cyan">PRICE MELT • LIVE FEED</span>
                <span className="font-display text-[10px] tracking-widest text-neon-red">
                  {hero ? `▼ -${heroDiscount}%` : ""}
                </span>
              </div>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff6a1a" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#ff6a1a" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[20, 40, 60, 80].map((y) => (
                  <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#2e2b26" strokeWidth="0.2" />
                ))}
                <path d={`${chartPath} L 100 100 L 0 100 Z`} fill="url(#grad)" />
                <path d={chartPath} fill="none" stroke="#ff6a1a" strokeWidth="1.2"
                  vectorEffect="non-scaling-stroke"
                  style={{ filter: "drop-shadow(0 0 6px #ff6a1a)" }} />
              </svg>
            </div>
          </div>

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
                const isDown = d.price <= d.prev;
                const color = isDown ? "text-neon-magenta" : "text-neon-blue";
                const glow = isDown ? "text-glow-magenta" : "text-glow-cyan";
                const status = d.crashUntil && d.crashUntil > Date.now()
                  ? "CRASH"
                  : isDown ? "DERRETENDO" : "EM ALTA";
                return (
                  <div key={d.id} className="panel-card rounded-md px-3 py-2 flex flex-col gap-1 flex-1 justify-center">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold tracking-wider text-sm text-foreground">
                        {d.emoji} {d.name}
                      </span>
                      <span className={`font-display text-xl ${color} ${glow}`}>{isDown ? "▼" : "▲"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`font-display font-black text-2xl tabular-nums ${color} ${glow}`}>
                        {fmt(d.price)}
                      </span>
                      <span className={`font-display text-[10px] tracking-widest px-2 py-0.5 rounded-sm border ${
                        status === "CRASH"
                          ? "border-neon-red text-neon-red animate-blink-dot"
                          : isDown ? "border-neon-magenta text-neon-magenta" : "border-neon-blue text-neon-blue"
                      }`}>
                        {status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <footer className="panel-card rounded-lg px-4 py-3 flex items-center gap-4 overflow-hidden">
          <div className="flex items-center gap-3 shrink-0">
            <div className="h-20 w-20 bg-white p-1.5 rounded-sm grid grid-cols-8 grid-rows-8 gap-0">
              {Array.from({ length: 64 }).map((_, i) => {
                const on = ((i * 31 + 7) % 5) > 1 || i < 8 || i % 8 === 0 || i % 8 === 7 || i > 55;
                const corner =
                  (i < 24 && i % 8 < 3) || (i < 24 && i % 8 > 4) || (i >= 40 && i % 8 < 3);
                return <div key={i} className={on || corner ? "bg-black" : "bg-white"} />;
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

          <div className="flex-1 overflow-hidden border-l border-panel-border pl-4 h-full flex items-center">
            <div className="flex animate-ticker whitespace-nowrap gap-8 font-display tracking-widest text-sm">
              {[...drinks, ...drinks, ...drinks].map((d, i) => {
                const isDown = d.price <= d.prev;
                return (
                  <span key={i} className="flex items-center gap-2">
                    <span className="text-foreground">{d.name}</span>
                    <span className={isDown ? "text-neon-magenta" : "text-neon-blue"}>{fmt(d.price)}</span>
                    <span className={isDown ? "text-neon-magenta" : "text-neon-blue"}>{isDown ? "▼" : "▲"}</span>
                    <span className="text-muted-foreground">•</span>
                  </span>
                );
              })}
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
