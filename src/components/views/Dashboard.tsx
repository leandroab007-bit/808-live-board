import { useEffect, useMemo, useState } from "react";
import { useMarket, type Sale } from "./marketStore";


const MAX_POINTS = 40;

export function Dashboard() {
  const { sales, event, clearSales, drinks, vouchers } = useMarket();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const { totalRevenue, totalUnits, crashRevenue, ranking, series } = useMemo(() => {
    let tr = 0,
      tu = 0,
      cr = 0;
    const byDrink: Record<string, { name: string; emoji: string; units: number; revenue: number }> = {};
    for (const s of sales) {
      tr += s.price;
      tu += 1;
      if (s.wasCrash) cr += s.price;
      const k = s.drinkId;
      if (!byDrink[k]) byDrink[k] = { name: s.drinkName, emoji: s.emoji, units: 0, revenue: 0 };
      byDrink[k].units += 1;
      byDrink[k].revenue += s.price;
    }
    // Ensure all current drinks appear in ranking even with 0 sales
    for (const d of drinks) {
      if (!byDrink[d.id]) byDrink[d.id] = { name: d.name, emoji: d.emoji, units: 0, revenue: 0 };
    }
    const rows = Object.entries(byDrink)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.units - a.units);

    // Build timeline series — bucket sales into MAX_POINTS slots over the session window
    let series: { t: number; total: number; crash: boolean }[] = [];
    if (sales.length > 0) {
      const start = sales[0].time;
      const end = Math.max(now, sales[sales.length - 1].time);
      const span = Math.max(1, end - start);
      const bucketMs = span / MAX_POINTS;
      const buckets: { total: number; crash: boolean }[] = Array.from(
        { length: MAX_POINTS },
        () => ({ total: 0, crash: false }),
      );
      for (const s of sales) {
        const idx = Math.min(MAX_POINTS - 1, Math.floor((s.time - start) / bucketMs));
        buckets[idx].total += s.price;
        if (s.wasCrash) buckets[idx].crash = true;
      }
      series = buckets.map((b, i) => ({ t: start + i * bucketMs, ...b }));
    }
    return { totalRevenue: tr, totalUnits: tu, crashRevenue: cr, ranking: rows, series };
  }, [sales, drinks, now]);

  const fmt = (n: number) =>
    `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Line chart geometry
  const chartW = 800,
    chartH = 180,
    pad = 8;
  const safeSeries = series.length ? series : [{ t: Date.now(), total: 0, crash: false }];
  const maxV = Math.max(1, ...safeSeries.map((p) => p.total));
  const stepX = safeSeries.length > 1 ? (chartW - pad * 2) / (safeSeries.length - 1) : 0;
  const points = safeSeries.map((p, i) => {
    const x = pad + i * stepX;
    const y = chartH - pad - (p.total / maxV) * (chartH - pad * 2);
    return { x, y, ...p };
  });
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${chartH - pad} L ${points[0].x.toFixed(1)} ${chartH - pad} Z`;

  const maxUnits = Math.max(1, ...ranking.map((r) => r.units));
  const crashCount = sales.filter((s) => s.wasCrash).length;

  // ===== Métricas de negócio simuladas (derivadas do estado atual) =====
  const activeDrinks = drinks.filter((d) => !d.paused).length;
  const opportunitiesCreated = drinks.length * 6 + crashCount * 2 + Math.floor(sales.length * 1.4);
  const opportunitiesActive = activeDrinks + (sales.length > 0 ? 2 : 0);
  const opportunitiesClosed = Math.max(0, opportunitiesCreated - opportunitiesActive);

  const vouchersGenerated = opportunitiesCreated + Math.floor(sales.length * 0.8);
  const vouchersRedeemed = sales.length;
  const conversionRate = vouchersGenerated > 0 ? (vouchersRedeemed / vouchersGenerated) * 100 : 0;

  const productStats = drinks.map((d, i) => {
    const r = ranking.find((x) => x.id === d.id);
    const sold = r?.units ?? 0;
    const views = sold * 6 + (drinks.length - i) * 11 + Math.floor(d.original);
    const reserved = sold * 2 + Math.max(0, Math.floor(d.original - d.minPrice));
    return { id: d.id, name: d.name, emoji: d.emoji, views, reserved, redeemed: sold };
  });
  const mostViewed = [...productStats].sort((a, b) => b.views - a.views)[0];
  const mostReserved = [...productStats].sort((a, b) => b.reserved - a.reserved)[0];
  const mostRedeemed = [...productStats].sort((a, b) => b.redeemed - a.redeemed)[0];

  const activeParticipants = 24 + vouchersGenerated * 2 + activeDrinks * 5;
  const qrScans = vouchersGenerated * 3 + Math.floor(sales.length * 1.7) + 48;
  let peakHour = "—";
  if (series.length > 0) {
    const peak = series.reduce((a, b) => (b.total > a.total ? b : a));
    if (peak.total > 0)
      peakHour = new Date(peak.t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <main className="relative min-h-full w-full bg-background text-foreground overflow-y-auto">
      <div className="pointer-events-none fixed inset-0 scanlines z-50" />
      <div className="pointer-events-none fixed inset-0 z-40 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)]" />

      <div className="relative z-10 flex flex-col p-4 gap-3">
        <header className="panel-card rounded-lg px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-neon-lime animate-blink-dot shadow-[0_0_15px_var(--neon-lime)]" />
            <span className="font-display text-xs tracking-[0.3em] text-neon-lime">DASHBOARD · LIVE</span>
          </div>
          <h1 className="font-display font-black text-xl md:text-2xl tracking-[0.15em] text-center text-glow-cyan text-neon-cyan">
            DASHBOARD DE <span className="text-neon-lime text-glow-lime">RESULTADOS</span>
          </h1>
          <button
            onClick={clearSales}
            className="font-display text-[10px] tracking-widest text-neon-magenta border border-neon-magenta/40 rounded px-3 py-1 hover:bg-neon-magenta/10"
            title="Zerar todas as vendas registradas"
          >
            ZERAR VENDAS
          </button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <KpiCard
            label="Faturamento Total Bruto"
            value={fmt(totalRevenue)}
            sub={`${sales.length} venda${sales.length === 1 ? "" : "s"} · App do Cliente`}
            accent="lime"
            icon="💰"
          />
          <KpiCard
            label="Vouchers Resgatados"
            value={`${totalUnits.toLocaleString("pt-BR")}`}
            sub="travados via App do Cliente"
            accent="cyan"
            icon="🎟️"
          />
          <KpiCard
            label="Vouchers em Crash"
            value={fmt(crashRevenue)}
            sub={`${totalRevenue > 0 ? ((crashRevenue / totalRevenue) * 100).toFixed(1) : "0.0"}% do total durante alertas`}
            accent="magenta"
            icon="⚠️"
          />
        </section>

        {sales.length === 0 && <EmptyState eventName={event.name} />}

        {/* Prioridade do modelo de negócio: Oportunidades e Vouchers vêm primeiro */}
        <SectionHeader title="OPORTUNIDADES" accent="lime" icon="🎯" />
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricTile label="Oportunidades Criadas" value={opportunitiesCreated.toLocaleString("pt-BR")} sub="ao longo do evento" accent="lime" />
          <MetricTile label="Oportunidades Ativas" value={opportunitiesActive.toLocaleString("pt-BR")} sub={`${activeDrinks} produto(s) liberados`} accent="cyan" />
          <MetricTile label="Oportunidades Encerradas" value={opportunitiesClosed.toLocaleString("pt-BR")} sub="expiradas ou consumidas" accent="magenta" />
        </section>

        <SectionHeader title="VOUCHERS" accent="cyan" icon="🎟️" />
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricTile label="Vouchers Gerados" value={vouchersGenerated.toLocaleString("pt-BR")} sub="emitidos via App do Cliente" accent="cyan" />
          <MetricTile label="Vouchers Resgatados" value={vouchersRedeemed.toLocaleString("pt-BR")} sub="travados e validados" accent="lime" />
          <MetricTile label="Taxa de Conversão" value={`${conversionRate.toFixed(1)}%`} sub="resgatados ÷ gerados" accent="magenta">
            <div className="h-2 w-full rounded-sm bg-panel-border/60 overflow-hidden mt-2">
              <div className="h-full bg-gradient-to-r from-neon-magenta/70 to-neon-magenta shadow-[0_0_10px_var(--neon-magenta)]" style={{ width: `${Math.min(100, conversionRate)}%` }} />
            </div>
          </MetricTile>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="panel-card rounded-lg p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-panel-border pb-2">
              <span className="font-display font-bold tracking-[0.2em] text-sm text-neon-lime">
                ▦ RANKING · PRODUTOS MAIS RESGATADOS
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
                const textMap = {
                  lime: "text-neon-lime",
                  cyan: "text-neon-cyan",
                  magenta: "text-neon-magenta",
                } as const;
                return (
                  <div key={r.id} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between">
                      <span className="font-display font-bold tracking-wider text-sm flex items-center gap-2">
                        <span className={`text-xs ${textMap[accent]}`}>
                          {(i + 1).toString().padStart(2, "0")}º
                        </span>
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
                <span>
                  AGORA ·{" "}
                  {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span>{event.endTime}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-panel-border">
              <MiniStat label="Resgates" value={`${sales.length}`} accent="cyan" />
              <MiniStat label="Ticket Médio" value={fmt(totalUnits ? totalRevenue / totalUnits : 0)} accent="lime" />
              <MiniStat label="Crashes" value={`${crashCount}`} accent="magenta" />
            </div>
          </div>
        </section>

        <SectionHeader title="PRODUTOS" accent="magenta" icon="🥂" />
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ProductTile label="Mais Visualizado" product={mostViewed} metric={`${mostViewed?.views ?? 0} views`} accent="cyan" />
          <ProductTile label="Mais Reservado" product={mostReserved} metric={`${mostReserved?.reserved ?? 0} reservas`} accent="lime" />
          <ProductTile label="Mais Resgatado" product={mostRedeemed} metric={`${mostRedeemed?.redeemed ?? 0} resgates`} accent="magenta" />
        </section>

        <SectionHeader title="EVENTO" accent="cyan" icon="📡" />
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MetricTile label="Participantes Ativos" value={activeParticipants.toLocaleString("pt-BR")} sub="dispositivos conectados" accent="lime" />
          <MetricTile label="Escaneamentos de QR" value={qrScans.toLocaleString("pt-BR")} sub="acessos via QR Code" accent="cyan" />
          <MetricTile label="Horário de Maior Movimento" value={peakHour} sub={peakHour === "—" ? "aguardando vendas" : "pico de receita"} accent="magenta" />
        </section>

        <RecentSales sales={sales} fmt={fmt} />

        <footer className="font-body text-[10px] tracking-widest text-muted-foreground text-center pb-2">
          OPORTUNIDADES PROMOCIONAIS · VOUCHERS RESGATADOS VIA "TRAVAR PREÇO" NO APP DO CLIENTE
        </footer>
      </div>
    </main>
  );
}

type Accent = "lime" | "cyan" | "magenta";

function KpiCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  accent: Accent;
  icon: string;
}) {
  const map = {
    lime: { text: "text-neon-lime text-glow-lime", border: "border-neon-lime/40", bg: "bg-neon-lime/5" },
    cyan: { text: "text-neon-cyan text-glow-cyan", border: "border-neon-cyan/40", bg: "bg-neon-cyan/5" },
    magenta: {
      text: "text-neon-magenta text-glow-magenta",
      border: "border-neon-magenta/40",
      bg: "bg-neon-magenta/5",
    },
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

function EmptyState({ eventName }: { eventName: string }) {
  return (
    <div className="panel-card rounded-lg p-6 border border-dashed border-panel-border text-center flex flex-col gap-2">
      <span className="font-display text-sm tracking-widest text-neon-cyan">
        AGUARDANDO PRIMEIRA VENDA
      </span>
      <span className="font-body text-xs text-muted-foreground">
        Vá até <span className="text-neon-lime">📱 App do Cliente</span> e toque em
        <span className="text-neon-lime"> 🔒 TRAVAR </span>
        para registrar uma venda real no evento <span className="text-foreground/90">{eventName}</span>.
      </span>
    </div>
  );
}

function RecentSales({ sales, fmt }: { sales: Sale[]; fmt: (n: number) => string }) {
  if (sales.length === 0) return null;
  const recent = [...sales].slice(-8).reverse();
  return (
    <div className="panel-card rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-panel-border pb-2">
        <span className="font-display font-bold tracking-[0.2em] text-sm text-neon-cyan">
          ▣ ÚLTIMAS VENDAS
        </span>
        <span className="font-display text-[10px] tracking-widest text-muted-foreground">
          MOSTRANDO {recent.length} DE {sales.length}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-panel-border/50">
        {recent.map((s) => {
          const time = new Date(s.time).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          return (
            <div key={s.id} className="flex items-center justify-between py-2 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg">{s.emoji}</span>
                <div className="flex flex-col leading-tight min-w-0">
                  <span className="font-display font-bold text-xs tracking-wider truncate">
                    {s.drinkName}
                  </span>
                  <span className="font-body text-[10px] tracking-widest text-muted-foreground tabular-nums">
                    {time}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {s.wasCrash && (
                  <span className="font-display text-[9px] tracking-widest text-neon-magenta border border-neon-magenta/50 px-1.5 py-0.5 rounded">
                    CRASH
                  </span>
                )}
                <span className="font-display font-black tabular-nums text-sm text-neon-lime text-glow-lime">
                  {fmt(s.price)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ title, accent, icon }: { title: string; accent: Accent; icon: string }) {
  const map = {
    lime: "text-neon-lime border-neon-lime/40",
    cyan: "text-neon-cyan border-neon-cyan/40",
    magenta: "text-neon-magenta border-neon-magenta/40",
  }[accent];
  return (
    <div className={`flex items-center gap-3 pt-2 border-b pb-1 ${map}`}>
      <span className="text-base">{icon}</span>
      <span className="font-display font-black text-xs tracking-[0.3em]">{title}</span>
      <span className="flex-1 h-px bg-current opacity-20" />
    </div>
  );
}

function MetricTile({
  label,
  value,
  sub,
  accent,
  children,
}: {
  label: string;
  value: string;
  sub: string;
  accent: Accent;
  children?: React.ReactNode;
}) {
  const map = {
    lime: { text: "text-neon-lime", border: "border-neon-lime/30" },
    cyan: { text: "text-neon-cyan", border: "border-neon-cyan/30" },
    magenta: { text: "text-neon-magenta", border: "border-neon-magenta/30" },
  }[accent];
  return (
    <div className={`panel-card rounded-lg p-4 border ${map.border} flex flex-col gap-1`}>
      <span className="font-body text-[10px] tracking-[0.25em] uppercase text-muted-foreground">{label}</span>
      <span className={`font-display font-black text-2xl md:text-3xl tabular-nums ${map.text}`}>{value}</span>
      <span className="font-body text-[10px] text-muted-foreground">{sub}</span>
      {children}
    </div>
  );
}

function ProductTile({
  label,
  product,
  metric,
  accent,
}: {
  label: string;
  product?: { name: string; emoji: string };
  metric: string;
  accent: Accent;
}) {
  const map = {
    lime: { text: "text-neon-lime", border: "border-neon-lime/30" },
    cyan: { text: "text-neon-cyan", border: "border-neon-cyan/30" },
    magenta: { text: "text-neon-magenta", border: "border-neon-magenta/30" },
  }[accent];
  return (
    <div className={`panel-card rounded-lg p-4 border ${map.border} flex flex-col gap-2`}>
      <span className="font-body text-[10px] tracking-[0.25em] uppercase text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{product?.emoji ?? "—"}</span>
        <div className="flex flex-col leading-tight min-w-0">
          <span className={`font-display font-black text-base tracking-wider truncate ${map.text}`}>
            {product?.name ?? "—"}
          </span>
          <span className="font-body text-[11px] text-muted-foreground tabular-nums">{metric}</span>
        </div>
      </div>
    </div>
  );
}
