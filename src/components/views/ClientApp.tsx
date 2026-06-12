import { useEffect, useMemo, useState } from "react";
import { useMarket, type MarketDrink, type Voucher } from "./marketStore";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Drink = MarketDrink;

export function ClientApp() {
  const { drinks: allDrinks, vouchers, createVoucher, redeemVoucher } = useMarket();
  // Pausados / market crash automaticamente excluídos da lista de oportunidades
  const drinks = useMemo(() => allDrinks.filter((d) => !d.paused), [allDrinks]);

  const [selectedId, setSelectedId] = useState<string>("gin");
  const [activeVoucherId, setActiveVoucherId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // se o drink selecionado foi pausado, escolhe outro
  useEffect(() => {
    if (drinks.length > 0 && !drinks.find((d) => d.id === selectedId)) {
      setSelectedId(drinks[0].id);
    }
  }, [drinks, selectedId]);

  const selected = drinks.find((d) => d.id === selectedId) ?? drinks[0];
  const fmt = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

  const activeVoucher = activeVoucherId ? vouchers.find((v) => v.id === activeVoucherId) ?? null : null;
  // Bloqueia novos travamentos somente enquanto houver voucher ATIVO.
  const lockBusy = !!activeVoucher && activeVoucher.status === "ACTIVE";

  const handleLock = (d: Drink) => {
    setSelectedId(d.id);
    const v = createVoucher(d.id);
    if (v) setActiveVoucherId(v.id);
  };

  if (!selected) {
    return (
      <main className="relative h-full w-full flex items-center justify-center bg-background text-foreground">
        <span className="font-display tracking-widest text-neon-red animate-blink-dot">MERCADO FECHADO · AGUARDE</span>
      </main>
    );
  }


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

          {/* HERO: selected drink with prominent price */}
          <HeroPrice drink={selected} fmt={fmt} now={now} onLock={() => handleLock(selected)} locked={lockBusy} />

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
                disabled={lockBusy}
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

      {/* VOUCHER MODAL */}
      <VoucherModal
        voucher={activeVoucher}
        now={now}
        fmt={fmt}
        onClose={() => setActiveVoucherId(null)}
        onPay={() => activeVoucher && redeemVoucher(activeVoucher.id)}
      />
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

/* ---------- VOUCHER MODAL ---------- */

function VoucherQR({ seed }: { seed: string }) {
  // Pseudo QR derivado do seed (estável por voucher) — mesmo padrão visual usado antes.
  const cells = useMemo(() => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return Array.from({ length: 144 }).map((_, i) => {
      const corner =
        (i < 36 && i % 12 < 3) ||
        (i < 36 && i % 12 > 8) ||
        (i >= 108 && i % 12 < 3);
      h = (h * 1103515245 + 12345) >>> 0;
      const on = (h % 7) > 2 || corner;
      return on;
    });
  }, [seed]);
  return (
    <div className="h-44 w-44 bg-white p-2 rounded-md grid grid-cols-12 grid-rows-12 shrink-0 mx-auto">
      {cells.map((on, i) => (
        <div key={i} className={on ? "bg-black" : "bg-white"} />
      ))}
    </div>
  );
}

function VoucherModal({
  voucher,
  now,
  fmt,
  onClose,
  onPay,
}: {
  voucher: Voucher | null;
  now: number;
  fmt: (n: number) => string;
  onClose: () => void;
  onPay: () => void;
}) {
  const open = !!voucher;
  const remaining = voucher ? Math.max(0, Math.ceil((voucher.expiresAt - now) / 1000)) : 0;
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  const status = voucher?.status ?? "ACTIVE";
  const statusMap = {
    ACTIVE: { label: "ATIVO", text: "text-neon-lime", border: "border-neon-lime/70", bg: "bg-neon-lime/10", glow: "shadow-[0_0_25px_oklch(0.82_0.28_145/0.35)]" },
    REDEEMED: { label: "RESGATADO", text: "text-neon-cyan", border: "border-neon-cyan/70", bg: "bg-neon-cyan/10", glow: "shadow-[0_0_25px_oklch(0.85_0.18_220/0.35)]" },
    EXPIRED: { label: "EXPIRADO", text: "text-neon-red", border: "border-neon-red/70", bg: "bg-neon-red/10", glow: "shadow-[0_0_25px_oklch(0.65_0.3_25/0.35)]" },
  }[status];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className={`max-w-sm panel-card border-2 ${statusMap.border} ${statusMap.glow} p-5`}>
        <DialogTitle className="font-display font-black tracking-[0.25em] text-center text-sm text-neon-cyan text-glow-cyan">
          VOUCHER · 808LIVE
        </DialogTitle>
        <DialogDescription className="sr-only">
          Voucher gerado a partir do preço travado no App do Cliente.
        </DialogDescription>

        {voucher && (
          <div className="flex flex-col gap-4">
            {/* Status + countdown */}
            <div className="flex items-center justify-between">
              <span className={`font-display font-black text-xs tracking-[0.25em] px-2 py-1 rounded border ${statusMap.border} ${statusMap.bg} ${statusMap.text}`}>
                ● {statusMap.label}
              </span>
              {status === "ACTIVE" ? (
                <span className={`font-display font-black text-2xl tabular-nums ${remaining <= 15 ? "text-neon-red text-glow-red animate-blink-dot" : "text-neon-lime text-glow-lime"}`}>
                  {mm}:{ss}
                </span>
              ) : (
                <span className="font-display font-bold text-[10px] tracking-widest text-muted-foreground">
                  {status === "REDEEMED" ? "PAGO" : "TEMPO ESGOTADO"}
                </span>
              )}
            </div>

            {/* Produto + preço */}
            <div className="flex items-center gap-3 border-y border-panel-border py-3">
              <span className="text-4xl">{voucher.emoji}</span>
              <div className="flex flex-col min-w-0">
                <span className="font-display font-bold text-sm text-foreground truncate tracking-wider">
                  {voucher.drinkName}
                </span>
                <span className="font-body text-[10px] tracking-widest text-muted-foreground line-through">
                  {fmt(voucher.original)}
                </span>
                <span className="font-display font-black text-3xl text-neon-lime text-glow-lime tabular-nums leading-tight">
                  {fmt(voucher.price)}
                </span>
              </div>
            </div>

            {/* QR */}
            <div className={`rounded-md ${status === "EXPIRED" ? "opacity-30 grayscale" : status === "REDEEMED" ? "opacity-60" : ""}`}>
              <VoucherQR seed={voucher.id} />
            </div>

            {/* ID */}
            <div className="flex flex-col items-center gap-0.5">
              <span className="font-body text-[9px] tracking-[0.3em] uppercase text-muted-foreground">ID do voucher</span>
              <span className="font-display font-black text-base tracking-[0.25em] text-neon-cyan tabular-nums">
                {voucher.id}
              </span>
            </div>

            {/* Ações */}
            <div className="flex flex-col gap-2 pt-1">
              {status === "ACTIVE" && (
                <button
                  onClick={onPay}
                  className="w-full font-display font-black text-sm tracking-[0.2em] py-3 rounded-xl bg-neon-magenta/15 border-2 border-neon-magenta text-neon-magenta hover:bg-neon-magenta/25 transition-all shadow-[0_0_20px_oklch(0.7_0.3_330/0.3)]"
                >
                  💳 SIMULAR PAGAMENTO
                </button>
              )}
              {status === "REDEEMED" && (
                <div className="w-full font-display font-black text-sm tracking-[0.2em] py-3 rounded-xl bg-neon-cyan/10 border-2 border-neon-cyan/60 text-neon-cyan text-center">
                  ✓ PAGAMENTO CONFIRMADO
                </div>
              )}
              {status === "EXPIRED" && (
                <div className="w-full font-display font-black text-sm tracking-[0.2em] py-3 rounded-xl bg-neon-red/10 border-2 border-neon-red/60 text-neon-red text-center">
                  ✕ VOUCHER EXPIRADO
                </div>
              )}
              <button
                onClick={onClose}
                className="w-full font-display font-bold text-[11px] tracking-[0.25em] py-2 rounded-lg border border-panel-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all"
              >
                FECHAR
              </button>
            </div>

            <p className="text-center font-body text-[10px] tracking-wider text-muted-foreground">
              {status === "ACTIVE"
                ? "Mostre este QR no caixa para retirar."
                : status === "REDEEMED"
                  ? "Voucher utilizado · não pode ser reaproveitado."
                  : "Voucher expirou · gere um novo travamento."}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
