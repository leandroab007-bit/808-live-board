import { useEffect, useMemo, useRef, useState } from "react";
import { useMarket } from "./marketStore";

type SalesMap = Record<string, { units: number; revenue: number; crashRevenue: number }>;
type RevPoint = { t: number; total: number; crash: boolean };

const MAX_POINTS = 40;

export function Dashboard() {
  const { drinks, bolsa, marketPaused, event } = useMarket();

  const [sales, setSales] = useState<SalesMap>(() =>
    Object.fromEntries(drinks.map((d) => [d.id, { units: 0, revenue: 0, crashRevenue: 0 }])),
  );
  const [revSeries, setRevSeries] = useState<RevPoint[]>([]);

  const drinksRef = useRef(drinks);
  drinksRef.current = drinks;
  const cfgRef = useRef({ bolsa, marketPaused });
  cfgRef.current = { bolsa, marketPaused };

  // Simulated sales ticker: faster when frequency is high, more units when intensity is high.
  useEffect(() => {
    const id = setInterval(() => {
      const { bolsa: b, marketPaused: mp } = cfgRef.current;
      if (!b.open || mp) return;

      const list = drinksRef.current;
      let tickTotal = 0;
      let crashTick = false;

      setSales((prev) => {
        const next: SalesMap = { ...prev };
        for (const d of list) {
          if (d.paused) continue;
          const isCrashed = !!d.crashUntil && d.crashUntil > Date.now();
          // discount factor 0..1 — more attractive price => more sales
          const discount = Math.max(0, (d.original - d.price) / d.original);
          const base = 1 + Math.random() * 2 + discount * 4 + (isCrashed ? 6 : 0);
          const units = Math.max(1, Math.round(base));
          const revenue = units * d.price;
          const cur = next[d.id] ?? { units: 0, revenue: 0, crashRevenue: 0 };
          next[d.id] = {
            units: cur.units + units,
            revenue: cur.revenue + revenue,
            crashRevenue: cur.crashRevenue + (isCrashed ? revenue : 0),
          };
          tickTotal += revenue;
          if (isCrashed) crashTick = true;
        }
        return next;
      });

      setRevSeries((prev) => {
        const pt: RevPoint = { t: Date.now(), total: tickTotal, crash: crashTick };
        return [...prev.slice(-(MAX_POINTS - 1)), pt];
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // Seed sales entries for any newly added drinks
  useEffect(() => {
    setSales((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const d of drinks) {
        if (!next[d.id]) {
          next[d.id] = { units: 0, revenue: 0, crashRevenue: 0 };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [drinks]);

  const { totalRevenue, totalUnits, crashRevenue, ranking } = useMemo(() => {
    let tr = 0, tu = 0, cr = 0;
    const rows = drinks.map((d) => {
      const s = sales[d.id] ?? { units: 0, revenue: 0, crashRevenue: 0 };
      tr += s.revenue; tu += s.units; cr += s.crashRevenue;
      return { id: d.id, name: d.name, emoji: d.emoji, units: s.units, revenue: s.revenue };
    });
    rows.sort((a, b) => b.units - a.units);
    return { totalRevenue: tr, totalUnits: tu, crashRevenue: cr, ranking: rows };
  }, [drinks, sales]);

  const fmt = (n: number) =>
    `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Line chart geometry
  const chartW = 800, chartH = 180, pad = 8;
  const series = revSeries.length ? revSeries : [{ t: Date.now(), total: 0, crash: false }];
  const maxV = Math.max(1, ...series.map((p) => p.total));
  const stepX = series.length > 1 ? (chartW - pad * 2) / (series.length - 1) : 0;
  const points = series.map((p, i) => {
    const x = pad + i * stepX;
    const y = chartH - pad - (p.total / maxV) * (chartH - pad * 2);
    return { x, y, ...p };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${chartH - pad} L ${points[0].x.toFixed(1)} ${chartH - pad} Z`;

  const maxUnits = Math.max(1, ...ranking.map((r) => r.units));

  return (
    <main className="relative min-h-full w-full bg-background text-foreground overflow-y-auto">
      <div className="pointer-events-none fixed inset-0 scanlines z-50" />
      <div className="pointer-events-none fixed inset-0 z-40 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)]" />

      <div className="relative z-10 flex flex-col p-4 gap-3">
        {/* Header */}
        <header className="panel-card rounded-lg px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-neon-lime animate-blink-dot shadow-[0_0_15px_var(--neon-lime)]" />
            <span className="font-display text-xs tracking-[0.3em] text-neon-lime">DASHBOARD · LIVE</span>
          </div>
          <h1 className="font-display font-black text-xl md:text-2xl tracking-[0.15em] text-center text-glow-cyan text-neon-cyan">
            DASHBOARD DE <span className="text-neon-lime text-glow-lime">RESULTADOS</span>
          </h1>
          <span className="font-display text-[10px] tracking-widest text-muted-foreground hidden md:inline">
            {event.name}
          </span>
        </header>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard
            label="Faturamento Total Bruto"
            value={fmt(totalRevenue)}
            sub="Acumulado da sessão"
            accent="lime"
            icon="💰"
          />
          <KpiCard
            label="Total de Drinks Vendidos"
            value={`${totalUnits.toLocaleString("pt-BR")}`}
            sub="unidades · todos os drinks"
            accent="cyan"
            icon="🥂"
          />
          <KpiCard
            label="Pico de Vendas em Crash"
            value={fmt(crashRevenue)}
            sub={`${totalRevenue > 0 ? ((crashRevenue / totalRevenue) * 100).toFixed(1) : "0.0"}% do total durante alertas`}
            accent="magenta"
            icon="⚠️"
          />
        </section>

        {/* Charts grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Ranking bar chart */}
          <div className="panel-card rounded-lg p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-panel-border pb-2">
              <span className="font-display font-bold tracking-[0.2em] text-sm text-neon-lime">
                ▦ RANKING · MAIS VENDIDOS
              </span>
              <span className="font-display text-[10px] tracking-widest text-muted-foreground">
                TOP {ranking.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {ranking.map((r, i) => {
                const pct = (r.units / maxUnits) * 100;
                const accent = i === 0 ? "lime" : i === 1 ? "cyan" : "magenta";
                const colorMap = {
                  lime: "from-neon-lime/80 to-neon-lime shadow-[0_0_12px_var(--neon-lime)]",
                  cyan: "from-neon-cyan/80 to-neon-cyan shadow-[0_0_12px_oklch(0.85_0.18_220)]",
                  magenta: "from-neon-magenta/80 to-neon-magenta shadow-[0_0_12px_var(--neon-magenta)]",
                } as const;
                const textMap = { lime: "text-neon-lime", cyan: "text-neon-cyan", magenta: "text-neon-magenta" } as const;
                return (
                  <div key={r.id} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between">
                      <span className="font-display font-bold tracking-wider text-sm flex items-center gap-2">
                        <span className={`text-xs ${textMap[accent]}`}>{(i + 1).toString().padStart(2, "0")}º</span>
                        <span>{r.emoji}</span>
                        <span className="text-foreground/90">{r.name}</span>
                      </span>
                      <span className={`font-display font-black tabular-nums text-sm ${textMap[accent]}`}>
                        {r.units} <span className="text-[10px] opacity-70">un</span>
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-sm bg-panel-border/60 overflow-hidden">
                      <div
                        className={`h-full rounded-sm bg-gradient-to-r ${colorMap[accent]} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-body text-[10px] text-muted-foreground tabular-nums">
                      {fmt(r.revenue)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Revenue line chart */}
          <div className="panel-card rounded-lg p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-panel-border pb-2">
              <span className="font-display font-bold tracking-[0.2em] text-sm text-neon-cyan">
                ▤ FATURAMENTO × HORÁRIO
              </span>
              <div className="flex items-center gap-3 font-display text-[10px] tracking-widest">
                <span className="text-neon-lime flex items-center gap-1">
                  <span className="h-1.5 w-3 bg-neon-lime rounded-sm shadow-[0_0_6px_var(--neon-lime)]" />
                  RECEITA
                </span>
                <span className="text-neon-magenta flex items-center gap-1">
                  <span className="h-1.5 w-3 bg-neon-magenta rounded-sm shadow-[0_0_6px_var(--neon-magenta)]" />
                  CRASH
                </span>
              </div>
            </div>

            <div className="relative w-full">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" className="w-full h-[180px]">
                <defs>
                  <linearGradient id="dash-rev-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--neon-lime)" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="var(--neon-lime)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* grid */}
                {[0.25, 0.5, 0.75].map((g) => (
                  <line
                    key={g}
                    x1={pad}
                    x2={chartW - pad}
                    y1={pad + g * (chartH - pad * 2)}
                    y2={pad + g * (chartH - pad * 2)}
                    stroke="var(--panel-border)"
                    strokeDasharray="3 5"
                    strokeWidth="0.6"
                  />
                ))}
                <path d={areaPath} fill="url(#dash-rev-fill)" />
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--neon-lime)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 6px var(--neon-lime))" }}
                />
                {/* crash markers */}
                {points.map((p, i) =>
                  p.crash ? (
                    <g key={i}>
                      <line
                        x1={p.x}
                        x2={p.x}
                        y1={pad}
                        y2={chartH - pad}
                        stroke="var(--neon-magenta)"
                        strokeOpacity="0.25"
                        strokeWidth="1"
                      />
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="3.5"
                        fill="var(--neon-magenta)"
                        style={{ filter: "drop-shadow(0 0 6px var(--neon-magenta))" }}
                      />
                    </g>
                  ) : null,
                )}
              </svg>
              <div className="flex justify-between font-body text-[10px] tracking-widest text-muted-foreground mt-1 px-1">
                <span>{event.startTime}</span>
                <span>AGORA · {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                <span>{event.endTime}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-panel-border">
              <MiniStat label="Ticks" value={`${revSeries.length}`} accent="cyan" />
              <MiniStat label="Pico" value={fmt(maxV)} accent="lime" />
              <MiniStat
                label="Crashes"
                value={`${revSeries.filter((p) => p.crash).length}`}
                accent="magenta"
              />
            </div>
          </div>
        </section>

        <footer className="font-body text-[10px] tracking-widest text-muted-foreground text-center pb-2">
          DADOS SIMULADOS · DERIVADOS DAS OSCILAÇÕES DO PAINEL DO PRODUTOR
        </footer>
      </div>
    </main>
  );
}

type Accent = "lime" | "cyan" | "magenta";

function KpiCard({ label, value, sub, accent, icon }: { label: string; value: string; sub: string; accent: Accent; icon: string }) {
  const map = {
    lime: { text: "text-neon-lime text-glow-lime", border: "border-neon-lime/40", bg: "bg-neon-lime/5" },
    cyan: { text: "text-neon-cyan text-glow-cyan", border: "border-neon-cyan/40", bg: "bg-neon-cyan/5" },
    magenta: { text: "text-neon-magenta text-glow-magenta", border: "border-neon-magenta/40", bg: "bg-neon-magenta/5" },
  }[accent];
  return (
    <div className={`panel-card rounded-lg p-5 border ${map.border} ${map.bg} flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className="font-body text-[10px] tracking-[0.25em] uppercase text-muted-foreground">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <span className={`font-display font-black text-3xl md:text-4xl tabular-nums tracking-tight ${map.text}`}>
        {value}
      </span>
      <span className="font-body text-[11px] text-muted-foreground">{sub}</span>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent: Accent }) {
  const map = { lime: "text-neon-lime", cyan: "text-neon-cyan", magenta: "text-neon-magenta" }[accent];
  return (
    <div className="flex flex-col items-center">
      <span className="font-body text-[9px] tracking-[0.25em] uppercase text-muted-foreground">{label}</span>
      <span className={`font-display font-black tabular-nums text-sm ${map}`}>{value}</span>
    </div>
  );
}
