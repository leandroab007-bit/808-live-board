import { useEffect, useState } from "react";

type Quote = { id: string; name: string; price: number; base: number };

const INITIAL: Quote[] = [
  { id: "gin", name: "GIN TÔNICA", price: 19.9, base: 19.9 },
  { id: "cerveja", name: "LONG NECK", price: 14.0, base: 14.0 },
  { id: "vodka", name: "VODKA ENERGÉTICO", price: 24.0, base: 24.0 },
  { id: "caip", name: "CAIPIRINHA", price: 18.5, base: 18.5 },
];

export function ClientApp() {
  const [quotes, setQuotes] = useState<Quote[]>(INITIAL);
  const [selectedId, setSelectedId] = useState<string>("gin");
  const [locked, setLocked] = useState<{ id: string; price: number; expiresAt: number } | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setQuotes((prev) =>
        prev.map((q) => {
          const drift = (Math.random() - 0.5) * 0.6;
          const next = Math.max(q.base * 0.7, Math.min(q.base * 1.3, q.price + drift));
          return { ...q, price: Number(next.toFixed(2)) };
        }),
      );
    }, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (locked && now >= locked.expiresAt) setLocked(null);
  }, [now, locked]);

  const selected = quotes.find((q) => q.id === selectedId)!;
  const formatPrice = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;
  const remaining = locked ? Math.max(0, Math.ceil((locked.expiresAt - now) / 1000)) : 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const handleLock = () => {
    setLocked({ id: selected.id, price: selected.price, expiresAt: Date.now() + 120_000 });
  };

  return (
    <main className="relative h-full w-full overflow-auto bg-background text-foreground flex items-start justify-center py-6 px-4">
      <div className="pointer-events-none fixed inset-0 scanlines z-10" />
      {/* Phone frame */}
      <div className="relative z-20 w-full max-w-[380px] rounded-[2.5rem] border-2 border-panel-border bg-black shadow-[0_0_60px_oklch(0.7_0.25_250/0.35)] overflow-hidden">
        {/* Notch */}
        <div className="relative h-7 bg-black flex items-center justify-center">
          <div className="absolute top-2 h-5 w-28 rounded-full bg-panel-border/60" />
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* App header */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col leading-tight">
              <span className="font-display font-black text-lg text-neon-cyan text-glow-cyan tracking-widest">
                808LIVE
              </span>
              <span className="font-body text-[10px] tracking-widest text-muted-foreground">
                APP DO CLIENTE
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-neon-lime animate-blink-dot shadow-[0_0_8px_var(--neon-lime)]" />
              <span className="font-display text-[10px] tracking-widest text-neon-lime">ONLINE</span>
            </div>
          </div>

          {/* Quote selector */}
          <div className="flex flex-col gap-2">
            <span className="font-body text-[10px] tracking-widest text-muted-foreground">
              ESCOLHA SEU DRINK
            </span>
            <div className="grid grid-cols-2 gap-2">
              {quotes.map((q) => {
                const active = q.id === selectedId;
                return (
                  <button
                    key={q.id}
                    onClick={() => setSelectedId(q.id)}
                    className={`rounded-lg border px-2 py-2 text-left transition-all ${
                      active
                        ? "border-neon-cyan bg-neon-cyan/10 shadow-[0_0_15px_oklch(0.85_0.18_220/0.4)]"
                        : "border-panel-border bg-panel/40 hover:border-neon-blue/60"
                    }`}
                  >
                    <div className="font-display font-bold text-[11px] tracking-wider text-foreground truncate">
                      {q.name}
                    </div>
                    <div
                      className={`font-display font-black text-base tabular-nums ${
                        active ? "text-neon-cyan text-glow-cyan" : "text-neon-blue"
                      }`}
                    >
                      {formatPrice(q.price)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected price card */}
          <div className="panel-card rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-cyan animate-blink-dot" />
            <span className="font-body text-[10px] tracking-widest text-muted-foreground">
              PREÇO AO VIVO
            </span>
            <div className="font-display font-black text-5xl tabular-nums text-neon-magenta text-glow-magenta leading-none">
              {formatPrice(selected.price)}
            </div>
            <span className="font-body text-[10px] tracking-widest text-neon-cyan">
              {selected.name} • OSCILANDO
            </span>
          </div>

          {/* Lock button */}
          <button
            onClick={handleLock}
            disabled={!!locked}
            className="w-full font-display font-black text-lg tracking-[0.2em] py-4 rounded-xl bg-neon-lime/15 border-2 border-neon-lime text-neon-lime hover:bg-neon-lime/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_oklch(0.82_0.28_145/0.3)]"
          >
            🔒 TRAVAR PREÇO
          </button>

          {/* Locked / countdown panel */}
          {locked ? (
            <div className="panel-card rounded-xl p-4 flex flex-col items-center gap-3 border border-neon-lime/60">
              <span className="font-display text-[10px] tracking-widest text-neon-lime text-glow-lime">
                ★ PREÇO TRAVADO ★
              </span>
              <span className="font-display font-black text-4xl text-neon-lime text-glow-lime tabular-nums">
                {formatPrice(locked.price)}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-body text-[10px] tracking-widest text-muted-foreground">
                  EXPIRA EM
                </span>
                <span className="font-display font-black text-2xl text-neon-red text-glow-red tabular-nums animate-blink-dot">
                  {mm}:{ss}
                </span>
              </div>

              {/* QR */}
              <div className="flex items-center gap-3 w-full mt-1">
                <div className="h-24 w-24 bg-white p-1.5 rounded-md grid grid-cols-8 grid-rows-8 shrink-0">
                  {Array.from({ length: 64 }).map((_, i) => {
                    const on = ((i * 37 + 11) % 5) > 1 || i < 8 || i % 8 === 0 || i % 8 === 7 || i > 55;
                    const corner =
                      (i < 24 && i % 8 < 3) || (i < 24 && i % 8 > 4) || (i >= 40 && i % 8 < 3);
                    return <div key={i} className={on || corner ? "bg-black" : "bg-white"} />;
                  })}
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-bold text-sm text-neon-cyan text-glow-cyan leading-tight">
                    MOSTRE NO CAIXA
                  </span>
                  <span className="font-body text-[10px] tracking-widest text-muted-foreground mt-1">
                    Apresente este QR Code para retirar seu drink no preço travado.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-panel-border p-3 text-center">
              <span className="font-body text-[11px] tracking-wider text-muted-foreground">
                Trave o preço atual por <span className="text-neon-cyan">2 minutos</span> antes que o mercado suba ↗
              </span>
            </div>
          )}
        </div>

        {/* Home indicator */}
        <div className="h-6 flex items-center justify-center">
          <div className="h-1 w-24 rounded-full bg-panel-border" />
        </div>
      </div>
    </main>
  );
}
