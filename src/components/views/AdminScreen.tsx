import { useEffect, useState } from "react";
import { useMarket } from "./marketStore";

export function AdminScreen() {
  const {
    drinks, event: eventCfg, bolsa, marketPaused,
    setEvent, setBolsa, setMarketPaused,
    updateDrink, adjustPrice, triggerCrash, togglePauseDrink,
  } = useMarket();

  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const formatPrice = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;
  const getCrashRemaining = (crashUntil: number | null) =>
    !crashUntil ? 0 : Math.max(0, Math.ceil((crashUntil - now) / 1000));

  const inputCls =
    "w-full bg-black/40 border border-panel-border rounded-md px-3 py-2 font-display text-sm text-neon-cyan focus:outline-none focus:border-neon-cyan transition-colors";
  const labelCls = "font-body text-[10px] tracking-[0.25em] text-muted-foreground uppercase";

  return (
    <main className="relative min-h-full w-full bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 scanlines z-50" />
      <div className="pointer-events-none fixed inset-0 z-40 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)]" />

      <div className="relative z-10 flex flex-col p-4 gap-3">
        {/* HEADER */}
        <header className="panel-card rounded-lg px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-neon-lime animate-blink-dot shadow-[0_0_15px_var(--neon-lime)]" />
            <span className="font-display text-xs tracking-[0.3em] text-neon-lime">ADMIN · LIVE SYNC</span>
          </div>
          <h1 className="font-display font-black text-xl md:text-2xl tracking-[0.15em] text-center text-glow-cyan text-neon-cyan">
            PAINEL DE CONTROLE <span className="text-muted-foreground">|</span>{" "}
            <span className="text-neon-lime text-glow-lime">808LIVE</span>
          </h1>
          <span className="font-display text-xs tracking-widest text-neon-red">LOGOUT</span>
        </header>

        {/* CONFIG ROW */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="panel-card rounded-lg p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-panel-border pb-2">
              <span className="font-display font-bold tracking-[0.2em] text-sm text-neon-cyan">
                ▣ CONFIGURAÇÃO DO EVENTO
              </span>
              <span className="font-display text-[10px] tracking-widest text-muted-foreground">RASCUNHO</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2 flex flex-col gap-1">
                <label className={labelCls}>Nome do evento</label>
                <input type="text" value={eventCfg.name}
                  onChange={(e) => setEvent({ ...eventCfg, name: e.target.value })} className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelCls}>Data</label>
                <input type="date" value={eventCfg.date}
                  onChange={(e) => setEvent({ ...eventCfg, date: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Início</label>
                  <input type="time" value={eventCfg.startTime}
                    onChange={(e) => setEvent({ ...eventCfg, startTime: e.target.value })} className={inputCls} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className={labelCls}>Encerramento</label>
                  <input type="time" value={eventCfg.endTime}
                    onChange={(e) => setEvent({ ...eventCfg, endTime: e.target.value })} className={inputCls} />
                </div>
              </div>
            </div>
          </div>

          <div className="panel-card rounded-lg p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-panel-border pb-2">
              <span className="font-display font-bold tracking-[0.2em] text-sm text-neon-magenta">
                ▤ CONFIGURAÇÃO DA BOLSA
              </span>
              <button
                onClick={() => setBolsa({ ...bolsa, open: !bolsa.open })}
                className={`font-display text-[10px] tracking-[0.25em] px-3 py-1 rounded border transition-all ${
                  bolsa.open
                    ? "border-neon-lime text-neon-lime bg-neon-lime/10"
                    : "border-neon-red text-neon-red bg-neon-red/10"
                }`}
              >
                {bolsa.open ? "● MERCADO ABERTO" : "○ MERCADO FECHADO"}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <SliderField label="Frequência das oscilações" value={bolsa.frequency} min={1} max={15} suffix="s"
                hint="Intervalo entre cada movimento de preço (sincroniza todas as telas)"
                onChange={(v) => setBolsa({ ...bolsa, frequency: v })} accent="cyan" />
              <SliderField label="Intensidade das oscilações" value={bolsa.intensity} min={1} max={50} suffix="%"
                hint="Variação máxima de preço por movimento"
                onChange={(v) => setBolsa({ ...bolsa, intensity: v })} accent="magenta" />
              <SliderField label="Tempo médio entre oportunidades" value={bolsa.opportunityWindow} min={1} max={30} suffix="min"
                hint="Frequência de flash sales / crashes automáticos"
                onChange={(v) => setBolsa({ ...bolsa, opportunityWindow: v })} accent="lime" />
              <SliderField label="Quantidade Média de Vouchers" value={bolsa.avgVouchers} min={1} max={15} suffix=" vch"
                hint="Define quantos vouchers promocionais serão disponibilizados em cada oportunidade."
                onChange={(v) => setBolsa({ ...bolsa, avgVouchers: v })} accent="cyan" />
            </div>
          </div>
        </section>

        {/* DRINKS GRID */}
        <section className="panel-card rounded-lg p-4">
          <div className="flex items-center justify-between border-b border-panel-border pb-2 mb-3">
            <span className="font-display font-bold tracking-[0.2em] text-sm text-neon-lime">
              ▦ CARDÁPIO & PREÇOS AO VIVO
            </span>
            <span className="font-display text-[10px] tracking-widest text-muted-foreground">
              {drinks.length} DRINKS · {drinks.filter((d) => !d.paused).length} ATIVOS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {drinks.map((d) => {
              const crashSec = getCrashRemaining(d.crashUntil);
              const isCrashed = crashSec > 0;
              return (
                <div key={d.id}
                  className={`rounded-lg border bg-black/40 p-4 flex flex-col gap-3 transition-all ${
                    d.paused ? "border-neon-red/60 opacity-60" : "border-panel-border"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{d.emoji}</span>
                    <input value={d.name}
                      onChange={(e) => updateDrink(d.id, "name", e.target.value)}
                      className="flex-1 bg-transparent border-b border-panel-border pb-1 font-display font-bold tracking-wider text-base text-neon-cyan focus:outline-none focus:border-neon-cyan" />
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {isCrashed && (
                      <span className="font-display text-[10px] tracking-widest text-neon-red animate-blink-dot">
                        CRASH 00:{crashSec.toString().padStart(2, "0")}
                      </span>
                    )}
                    {d.paused && (
                      <span className="font-display text-[10px] tracking-widest text-neon-red">PAUSADO</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className={labelCls}>Preço atual</span>
                    <span className={`font-display font-black text-3xl tabular-nums ${
                      isCrashed ? "text-neon-red animate-price-flash" : "text-neon-lime text-glow-lime"
                    }`}>
                      {formatPrice(d.price)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className={labelCls}>Original</label>
                      <input type="number" step="0.5" value={d.original}
                        onChange={(e) => updateDrink(d.id, "original", Number(e.target.value))} className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className={labelCls}>Mínimo</label>
                      <input type="number" step="0.5" value={d.minPrice}
                        onChange={(e) => updateDrink(d.id, "minPrice", Number(e.target.value))} className={inputCls} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className={labelCls}>Estoque disponível</label>
                    <input type="number" value={d.stock} min={0} max={100}
                      onChange={(e) => updateDrink(d.id, "stock", Number(e.target.value))} className={inputCls} />
                    <div className="h-1.5 w-full rounded-full bg-panel-border overflow-hidden mt-1">
                      <div className="h-full rounded-full bg-neon-lime shadow-[0_0_8px_var(--neon-lime)] transition-all"
                        style={{ width: `${Math.max(0, Math.min(100, d.stock))}%` }} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-1">
                    <div className="flex gap-2">
                      <button onClick={() => adjustPrice(d.id, 1)}
                        className="flex-1 font-display font-bold text-xs py-2 rounded-md bg-neon-blue/20 border border-neon-blue text-neon-blue hover:bg-neon-blue/30 transition-colors">
                        + R$ 1
                      </button>
                      <button onClick={() => adjustPrice(d.id, -1)}
                        className="flex-1 font-display font-bold text-xs py-2 rounded-md bg-neon-magenta/20 border border-neon-magenta text-neon-magenta hover:bg-neon-magenta/30 transition-colors">
                        − R$ 1
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => triggerCrash(d.id)} disabled={isCrashed}
                        className="flex-1 font-display font-bold text-xs py-2 rounded-md bg-neon-red/20 border border-neon-red text-neon-red hover:bg-neon-red/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                        ⚠️ CRASH
                      </button>
                      <button onClick={() => togglePauseDrink(d.id)}
                        className={`flex-1 font-display font-bold text-xs py-2 rounded-md border transition-colors ${
                          d.paused
                            ? "bg-neon-lime/20 border-neon-lime text-neon-lime hover:bg-neon-lime/30"
                            : "bg-panel-border/30 border-panel-border text-muted-foreground hover:border-neon-red hover:text-neon-red"
                        }`}>
                        {d.paused ? "▶ ATIVAR" : "❚❚ PAUSAR"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="flex justify-center pt-1 pb-2">
          <button onClick={() => setMarketPaused(!marketPaused)}
            className={`font-display font-black text-lg md:text-xl tracking-[0.2em] px-10 py-3 rounded-lg border-2 transition-all ${
              marketPaused
                ? "border-neon-red text-neon-red bg-neon-red/10 animate-price-flash"
                : "border-neon-lime text-neon-lime bg-neon-lime/10 hover:bg-neon-lime/20"
            }`}>
            {marketPaused ? "BOLSA PAUSADA" : "PAUSAR BOLSA"}
          </button>
        </footer>
      </div>
    </main>
  );
}

type Accent = "cyan" | "magenta" | "lime";

function SliderField({ label, value, min, max, suffix, hint, onChange, accent }: {
  label: string; value: number; min: number; max: number; suffix: string; hint: string;
  onChange: (v: number) => void; accent: Accent;
}) {
  const colorMap: Record<Accent, string> = {
    cyan: "text-neon-cyan", magenta: "text-neon-magenta", lime: "text-neon-lime",
  };
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label className="font-body text-[10px] tracking-[0.25em] text-muted-foreground uppercase">{label}</label>
        <span className={`font-display font-black text-lg tabular-nums ${colorMap[accent]}`}>
          {value}<span className="text-xs ml-0.5 opacity-70">{suffix}</span>
        </span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-current"
        style={{ accentColor: `var(--neon-${accent})` }} />
      <span className="font-body text-[10px] text-muted-foreground/80">{hint}</span>
    </div>
  );
}
