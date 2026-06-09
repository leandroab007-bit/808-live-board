import { useEffect, useMemo, useState } from "react";

type Drink = {
  id: string;
  name: string;
  emoji: string;
  original: number;
  base: number;
  price: number;
  prev: number;
  history: number[];
  windowEndsAt: number; // promo window for this drink
};

const WINDOW_MS = 90_000; // 90s rotating promo window per drink

function mkDrink(id: string, name: string, emoji: string, original: number, base: number): Drink {
  return {
    id,
    name,
    emoji,
    original,
    base,
    price: base,
    prev: base,
    history: Array.from({ length: 18 }, () => base),
    windowEndsAt: Date.now() + WINDOW_MS,
  };
}

const INITIAL: Drink[] = [
  mkDrink("gin", "GIN TÔNICA", "🍸", 35.0, 19.9),
  mkDrink("cerveja", "LONG NECK", "🍺", 18.0, 14.0),
  mkDrink("vodka", "VODKA ENERGÉTICO", "⚡", 32.0, 24.0),
  mkDrink("caip", "CAIPIRINHA", "🍹", 25.0, 18.5),
  mkDrink("negroni", "NEGRONI", "🥃", 38.0, 26.0),
];

export function ClientApp() {
  const [drinks, setDrinks] = useState<Drink[]>(INITIAL);
  const [selectedId, setSelectedId] = useState<string>("gin");
  const [locked, setLocked] = useState<{ id: string; name: string; price: number; expiresAt: number } | null>(null);
  const [now, setNow] = useState(Date.now());

  // price oscillation + history
  useEffect(() => {
    const id = setInterval(() => {
      setDrinks((prev) =>
        prev.map((d) => {
          const drift = (Math.random() - 0.5) * 0.9;
          const next = Math.max(d.base * 0.7, Math.min(d.base * 1.35, d.price + drift));
          const rounded = Number(next.toFixed(2));
          const history = [...d.history.slice(-17), rounded];
          let windowEndsAt = d.windowEndsAt;
          if (Date.now() > windowEndsAt) windowEndsAt = Date.now() + WINDOW_MS;
          return { ...d, prev: d.price, price: rounded, history, windowEndsAt };
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

  const selected = drinks.find((d) => d.id === selectedId)!;
  const fmt = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;
  const remaining = locked ? Math.max(0, Math.ceil((locked.expiresAt - now) / 1000)) : 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const handleLock = (d: Drink) => {
    setSelectedId(d.id);
    setLocked({ id: d.id, name: d.name, price: d.price, expiresAt: Date.now() + 120_000 });
  };

  return (
    <main className="relative h-full w-full overflow-auto bg-background text-foreground flex items-start justify-center py-4 px-3">
      <div className="pointer-events-none fixed inset-0 scanlines z-10" />
      {/* Phone frame */}
      <div className="relative z-20 w-full max-w-[400px] rounded-[2.5rem] border-2 border-panel-border bg-black shadow-[0_0_60px_oklch(0.7_0.25_250/0.35)] overflow-hidden flex flex-col">
        {/* Notch */}
        <div className="relative h-7 bg-black flex items-center justify-center shrink-0">
          <div className="absolute top-2 h-5 w-28 rounded-full bg-panel-border/60" />
        </div>

        <div className="p-3 flex flex-col gap-3">
          {/* App header */}
          <div className="flex items-center justify-between">
            <div className="flex flex-col leading-tight">
              <span className="font-display font-black text-lg text-neon-cyan text-glow-cyan tracking-widest">
                808LIVE
              </span>
              <span className="font-body text-[10px] tracking-widest text-muted-foreground">
                BOLSA DOS DRINKS · EVENTO AO VIVO
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-neon-lime animate-blink-dot shadow-[0_0_8px_var(--neon-lime)]" />
              <span className="font-display text-[10px] tracking-widest text-neon-lime">LIVE</span>
            </div>
          </div>

          {/* LOCKED VOUCHER (top priority when active) */}
          {locked && (
            <LockedVoucher
              name={locked.name}
              price={locked.price}
              mm={mm}
              ss={ss}
              fmt={fmt}
            />
          )}

          {/* HERO: selected drink with prominent price */}
          <HeroPrice drink={selected} fmt={fmt} now={now} onLock={() => handleLock(selected)} locked={!!locked} />

          {/* DRINKS LIST */}
          <div className="flex items-center justify-between pt-1">
            <span className="font-body text-[10px] tracking-widest text-muted-foreground">
              COTAÇÕES AO VIVO
            </span>
            <span className="font-body text-[10px] tracking-widest text-neon-cyan">
              ATUALIZA A CADA 3s
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {drinks.map((d) => (
              <DrinkRow
                key={d.id}
                drink={d}
                fmt={fmt}
                now={now}
                active={d.id === selectedId}
                disabled={!!locked}
                onSelect={() => setSelectedId(d.id)}
                onLock={() => handleLock(d)}
              />
            ))}
          </div>

          <p className="text-center font-body text-[10px] tracking-wider text-muted-foreground pt-1 pb-2">
            Trave o preço por <span className="text-neon-cyan">2 min</span> e retire no caixa com o QR.
          </p>
        </div>

        {/* Home indicator */}
        <div className="h-6 flex items-center justify-center shrink-0">
          <div className="h-1 w-24 rounded-full bg-panel-border" />
        </div>
      </div>
    </main>
  );
}

/* ---------- subcomponents ---------- */

function Sparkline({ data, trendUp }: { data: number[]; trendUp: boolean }) {
  const { d, area } = useMemo(() => {
    const w = 100;
    const h = 28;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const step = w / (data.length - 1);
    const pts = data.map((v, i) => [i * step, h - ((v - min) / range) * h] as const);
    const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    const area = `${d} L${w},${h} L0,${h} Z`;
    return { d, area };
  }, [data]);

  const stroke = trendUp ? "var(--neon-red)" : "var(--neon-lime)";
  const fill = trendUp ? "oklch(0.65 0.3 25 / 0.18)" : "oklch(0.82 0.28 145 / 0.18)";

  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full">
      <path d={area} fill={fill} />
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function CountdownChip({ endsAt, now }: { endsAt: number; now: number }) {
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const m = String(Math.floor(left / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  const urgent = left <= 15;
  return (
    <span
      className={`font-display font-bold text-[10px] tabular-nums tracking-widest px-1.5 py-0.5 rounded border ${
        urgent
          ? "text-neon-red border-neon-red/60 bg-neon-red/10 animate-blink-dot"
          : "text-neon-cyan border-neon-cyan/40 bg-neon-cyan/5"
      }`}
    >
      ⏱ {m}:{s}
    </span>
  );
}

function HeroPrice({
  drink,
  fmt,
  now,
  onLock,
  locked,
}: {
  drink: Drink;
  fmt: (n: number) => string;
  now: number;
  onLock: () => void;
  locked: boolean;
}) {
  const up = drink.price > drink.prev;
  const discount = Math.max(0, Math.round((1 - drink.price / drink.original) * 100));
  return (
    <div className="panel-card rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-cyan animate-blink-dot" />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl">{drink.emoji}</span>
          <div className="flex flex-col min-w-0">
            <span className="font-display font-bold text-sm tracking-wider text-foreground truncate">
              {drink.name}
            </span>
            <span className="font-body text-[10px] tracking-widest text-muted-foreground">
              PREÇO AO VIVO
            </span>
          </div>
        </div>
        <CountdownChip endsAt={drink.windowEndsAt} now={now} />
      </div>

      {/* Hero price */}
      <div className="flex items-end justify-between gap-2">
        <div className="flex flex-col leading-none">
          <span className="font-body text-xs tracking-widest text-muted-foreground line-through">
            {fmt(drink.original)}
          </span>
          <span
            className={`font-display font-black text-[3.25rem] tabular-nums leading-none ${
              up ? "text-neon-red text-glow-red" : "text-neon-lime text-glow-lime"
            }`}
          >
            {fmt(drink.price)}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`font-display font-black text-base tracking-widest px-2 py-0.5 rounded border ${
              up
                ? "text-neon-red border-neon-red/60 bg-neon-red/10"
                : "text-neon-lime border-neon-lime/60 bg-neon-lime/10"
            }`}
          >
            {up ? "▲" : "▼"} {Math.abs(((drink.price - drink.prev) / drink.prev) * 100).toFixed(1)}%
          </span>
          {discount > 0 && (
            <span className="font-display text-[10px] tracking-widest text-neon-magenta text-glow-magenta">
              -{discount}% OFF
            </span>
          )}
        </div>
      </div>

      {/* Mini chart - smaller than price */}
      <div className="h-10 -mx-1">
        <Sparkline data={drink.history} trendUp={up} />
      </div>

      <button
        onClick={onLock}
        disabled={locked}
        className="w-full font-display font-black text-base tracking-[0.2em] py-3 rounded-xl bg-neon-lime/15 border-2 border-neon-lime text-neon-lime hover:bg-neon-lime/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_oklch(0.82_0.28_145/0.3)]"
      >
        🔒 TRAVAR {fmt(drink.price)}
      </button>
    </div>
  );
}

function DrinkRow({
  drink,
  fmt,
  now,
  active,
  disabled,
  onSelect,
  onLock,
}: {
  drink: Drink;
  fmt: (n: number) => string;
  now: number;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
  onLock: () => void;
}) {
  const up = drink.price > drink.prev;
  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border p-2.5 flex items-center gap-2.5 cursor-pointer transition-all ${
        active
          ? "border-neon-cyan bg-neon-cyan/10 shadow-[0_0_15px_oklch(0.85_0.18_220/0.35)]"
          : "border-panel-border bg-panel/40 hover:border-neon-blue/60"
      }`}
    >
      <span className="text-xl shrink-0">{drink.emoji}</span>

      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-display font-bold text-[11px] tracking-wider text-foreground truncate">
          {drink.name}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display font-black text-base tabular-nums text-neon-cyan text-glow-cyan leading-none">
            {fmt(drink.price)}
          </span>
          <span className="font-body text-[9px] tracking-wider text-muted-foreground line-through">
            {fmt(drink.original)}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="h-5 w-14">
          <Sparkline data={drink.history} trendUp={up} />
        </div>
        <CountdownChip endsAt={drink.windowEndsAt} now={now} />
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onLock();
        }}
        disabled={disabled}
        className="shrink-0 font-display font-bold text-[10px] tracking-widest px-2.5 py-2 rounded-lg border border-neon-lime/70 text-neon-lime bg-neon-lime/10 hover:bg-neon-lime/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      >
        🔒
      </button>
    </div>
  );
}

function LockedVoucher({
  name,
  price,
  mm,
  ss,
  fmt,
}: {
  name: string;
  price: number;
  mm: string;
  ss: string;
  fmt: (n: number) => string;
}) {
  return (
    <div className="panel-card rounded-2xl p-3 flex flex-col gap-2 border-2 border-neon-lime/70 shadow-[0_0_25px_oklch(0.82_0.28_145/0.35)]">
      <div className="flex items-center justify-between">
        <span className="font-display text-[10px] tracking-widest text-neon-lime text-glow-lime">
          ★ VOUCHER ATIVO ★
        </span>
        <span className="font-display font-black text-lg text-neon-red text-glow-red tabular-nums animate-blink-dot">
          {mm}:{ss}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-20 w-20 bg-white p-1 rounded-md grid grid-cols-8 grid-rows-8 shrink-0">
          {Array.from({ length: 64 }).map((_, i) => {
            const on = (i * 37 + 11) % 5 > 1 || i < 8 || i % 8 === 0 || i % 8 === 7 || i > 55;
            const corner =
              (i < 24 && i % 8 < 3) || (i < 24 && i % 8 > 4) || (i >= 40 && i % 8 < 3);
            return <div key={i} className={on || corner ? "bg-black" : "bg-white"} />;
          })}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-display font-bold text-xs text-neon-cyan text-glow-cyan truncate">
            {name}
          </span>
          <span className="font-display font-black text-2xl text-neon-lime text-glow-lime tabular-nums leading-tight">
            {fmt(price)}
          </span>
          <span className="font-body text-[9px] tracking-widest text-muted-foreground mt-0.5">
            MOSTRE NO CAIXA P/ RETIRAR
          </span>
        </div>
      </div>
    </div>
  );
}
