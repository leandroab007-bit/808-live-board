import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type MarketDrink = {
  id: string;
  name: string;
  emoji: string;
  original: number;
  base: number;
  minPrice: number;
  price: number;
  prev: number;
  history: number[];
  stock: number; // 0..100
  paused: boolean;
  crashUntil: number | null;
  windowEndsAt: number;
};

export type EventConfig = {
  name: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type BolsaConfig = {
  open: boolean;
  frequency: number; // seconds between oscillations
  intensity: number; // % swing magnitude
  opportunityWindow: number; // minutes
  // Faixa média de vouchers liberados por oportunidade promocional (MVP visual).
  // Futuro: cada Produto poderá gerar múltiplas Oportunidades, cada uma com
  // sua própria quantidade de vouchers dentro desta faixa.
  avgVouchers: number; // 1..15
};

export type Sale = {
  id: string;
  drinkId: string;
  drinkName: string;
  emoji: string;
  price: number;
  original: number;
  wasCrash: boolean;
  time: number; // epoch ms
};

export type VoucherStatus = "ACTIVE" | "REDEEMED" | "EXPIRED";

export type Voucher = {
  id: string; // short uid shown to user
  drinkId: string;
  drinkName: string;
  emoji: string;
  price: number;
  original: number;
  wasCrash: boolean;
  createdAt: number;
  expiresAt: number;
  redeemedAt: number | null;
  status: VoucherStatus;
};

type Ctx = {
  drinks: MarketDrink[];
  event: EventConfig;
  bolsa: BolsaConfig;
  marketPaused: boolean;
  sales: Sale[];
  vouchers: Voucher[];
  setEvent: (e: EventConfig) => void;
  setBolsa: (b: BolsaConfig) => void;
  setMarketPaused: (p: boolean) => void;
  updateDrink: <K extends keyof MarketDrink>(id: string, key: K, value: MarketDrink[K]) => void;
  adjustPrice: (id: string, delta: number) => void;
  triggerCrash: (id: string) => void;
  togglePauseDrink: (id: string) => void;
  recordSale: (drinkId: string) => void;
  createVoucher: (drinkId: string) => Voucher | null;
  redeemVoucher: (voucherId: string) => void;
  clearSales: () => void;
};

const WINDOW_MS = 90_000;
const VOUCHER_TTL_MS = 120_000; // 2 minutos
const SALES_STORAGE_KEY = "808live.sales.v1";
const VOUCHERS_STORAGE_KEY = "808live.vouchers.v1";

function mk(id: string, name: string, emoji: string, original: number, base: number, minPrice: number, stock: number): MarketDrink {
  return {
    id, name, emoji, original, base, minPrice, stock,
    price: base, prev: base,
    history: Array.from({ length: 18 }, () => base),
    paused: false, crashUntil: null,
    windowEndsAt: Date.now() + WINDOW_MS,
  };
}

const INITIAL_DRINKS: MarketDrink[] = [
  mk("gin", "GIN TÔNICA", "🍸", 35.0, 19.9, 12, 85),
  mk("cerveja", "LONG NECK", "🍺", 18.0, 14.0, 8, 62),
  mk("vodka", "VODKA ENERGÉTICO", "⚡", 32.0, 24.0, 15, 45),
  mk("caip", "CAIPIRINHA", "🍹", 25.0, 18.5, 10, 30),
  mk("negroni", "NEGRONI", "🥃", 38.0, 26.0, 16, 55),
];

const MarketCtx = createContext<Ctx | null>(null);

function shortId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const [drinks, setDrinks] = useState<MarketDrink[]>(INITIAL_DRINKS);
  const [event, setEvent] = useState<EventConfig>({
    name: "808Live · Rooftop Sessions",
    date: "2026-06-21",
    startTime: "22:00",
    endTime: "04:00",
  });
  const [bolsa, setBolsa] = useState<BolsaConfig>({
    open: true, frequency: 3, intensity: 15, opportunityWindow: 8, avgVouchers: 6,
  });
  const [marketPaused, setMarketPaused] = useState(false);
  const [sales, setSales] = useState<Sale[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(SALES_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Sale[]) : [];
    } catch {
      return [];
    }
  });
  const [vouchers, setVouchers] = useState<Voucher[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(VOUCHERS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Voucher[]) : [];
    } catch {
      return [];
    }
  });

  // Persist sales + vouchers + cross-tab sync
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales)); } catch { /* ignore */ }
  }, [sales]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(VOUCHERS_STORAGE_KEY, JSON.stringify(vouchers)); } catch { /* ignore */ }
  }, [vouchers]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (!e.newValue) return;
      try {
        if (e.key === SALES_STORAGE_KEY) setSales(JSON.parse(e.newValue) as Sale[]);
        if (e.key === VOUCHERS_STORAGE_KEY) setVouchers(JSON.parse(e.newValue) as Voucher[]);
      } catch { /* ignore */ }
    };
    const onCustomSale = (e: Event) => {
      const detail = (e as CustomEvent<Sale>).detail;
      if (detail) setSales((prev) => (prev.find((s) => s.id === detail.id) ? prev : [...prev, detail]));
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("808live:sale", onCustomSale as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("808live:sale", onCustomSale as EventListener);
    };
  }, []);

  // Tick to expire vouchers automatically
  useEffect(() => {
    const id = setInterval(() => {
      setVouchers((prev) => {
        let changed = false;
        const next = prev.map((v) => {
          if (v.status === "ACTIVE" && Date.now() >= v.expiresAt) {
            changed = true;
            return { ...v, status: "EXPIRED" as VoucherStatus };
          }
          return v;
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Oscillation driven by bolsa.frequency + intensity. Skips paused drinks / closed or paused market.
  const cfgRef = useRef({ bolsa, marketPaused });
  cfgRef.current = { bolsa, marketPaused };

  useEffect(() => {
    const ms = Math.max(500, bolsa.frequency * 1000);
    const id = setInterval(() => {
      const { bolsa: b, marketPaused: mp } = cfgRef.current;
      if (!b.open || mp) return;
      setDrinks((prev) =>
        prev.map((d) => {
          if (d.paused) return d;
          if (d.crashUntil && Date.now() >= d.crashUntil) {
            const restored = d.base;
            return { ...d, prev: d.price, price: restored, history: [...d.history.slice(-17), restored], crashUntil: null };
          }
          const magnitude = (b.intensity / 100) * d.base;
          const drift = (Math.random() - 0.5) * 2 * magnitude;
          const next = Math.max(d.minPrice, Math.min(d.base * 1.5, d.price + drift));
          const rounded = Number(next.toFixed(2));
          let windowEndsAt = d.windowEndsAt;
          if (Date.now() > windowEndsAt) windowEndsAt = Date.now() + WINDOW_MS;
          return { ...d, prev: d.price, price: rounded, history: [...d.history.slice(-17), rounded], windowEndsAt };
        }),
      );
    }, ms);
    return () => clearInterval(id);
  }, [bolsa.frequency]);

  useEffect(() => {
    const id = setInterval(() => {
      setDrinks((prev) =>
        prev.map((d) =>
          d.crashUntil && Date.now() >= d.crashUntil
            ? { ...d, price: d.base, crashUntil: null }
            : d,
        ),
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const value = useMemo<Ctx>(() => ({
    drinks, event, bolsa, marketPaused, sales, vouchers,
    setEvent, setBolsa, setMarketPaused,
    updateDrink: (id, key, value) =>
      setDrinks((prev) => prev.map((d) => (d.id === id ? { ...d, [key]: value } : d))),
    adjustPrice: (id, delta) =>
      setDrinks((prev) =>
        prev.map((d) =>
          d.id === id
            ? { ...d, prev: d.price, price: Math.max(d.minPrice, Number((d.price + delta).toFixed(2))) }
            : d,
        ),
      ),
    triggerCrash: (id) =>
      setDrinks((prev) =>
        prev.map((d) =>
          d.id === id
            ? {
                ...d,
                prev: d.price,
                price: Math.max(d.minPrice, Number((d.price * 0.5).toFixed(2))),
                crashUntil: Date.now() + 120_000,
                history: [...d.history.slice(-17), Math.max(d.minPrice, Number((d.price * 0.5).toFixed(2)))],
              }
            : d,
        ),
      ),
    togglePauseDrink: (id) =>
      setDrinks((prev) => prev.map((d) => (d.id === id ? { ...d, paused: !d.paused } : d))),
    recordSale: (drinkId: string) => {
      const d = drinks.find((x) => x.id === drinkId);
      if (!d) return;
      const sale: Sale = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        drinkId: d.id,
        drinkName: d.name,
        emoji: d.emoji,
        price: d.price,
        original: d.original,
        wasCrash: !!d.crashUntil && d.crashUntil > Date.now(),
        time: Date.now(),
      };
      setSales((prev) => [...prev, sale]);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("808live:sale", { detail: sale }));
      }
    },
    createVoucher: (drinkId: string) => {
      const d = drinks.find((x) => x.id === drinkId);
      if (!d) return null;
      const now = Date.now();
      const v: Voucher = {
        id: `V-${shortId()}`,
        drinkId: d.id,
        drinkName: d.name,
        emoji: d.emoji,
        price: d.price,
        original: d.original,
        wasCrash: !!d.crashUntil && d.crashUntil > now,
        createdAt: now,
        expiresAt: now + VOUCHER_TTL_MS,
        redeemedAt: null,
        status: "ACTIVE",
      };
      setVouchers((prev) => [...prev, v]);
      return v;
    },
    redeemVoucher: (voucherId: string) => {
      let toRecord: Voucher | null = null;
      setVouchers((prev) =>
        prev.map((v) => {
          if (v.id !== voucherId) return v;
          if (v.status !== "ACTIVE") return v;
          toRecord = v;
          return { ...v, status: "REDEEMED" as VoucherStatus, redeemedAt: Date.now() };
        }),
      );
      // Record sale only when payment is simulated (voucher redeemed)
      setTimeout(() => {
        if (!toRecord) return;
        const v = toRecord;
        const sale: Sale = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          drinkId: v.drinkId,
          drinkName: v.drinkName,
          emoji: v.emoji,
          price: v.price,
          original: v.original,
          wasCrash: v.wasCrash,
          time: Date.now(),
        };
        setSales((prev) => [...prev, sale]);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("808live:sale", { detail: sale }));
        }
      }, 0);
    },
    clearSales: () => {
      setSales([]);
      setVouchers([]);
    },
  }), [drinks, event, bolsa, marketPaused, sales, vouchers]);

  return <MarketCtx.Provider value={value}>{children}</MarketCtx.Provider>;
}

export function useMarket() {
  const ctx = useContext(MarketCtx);
  if (!ctx) throw new Error("useMarket must be used inside <MarketProvider>");
  return ctx;
}
