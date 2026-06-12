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

type Ctx = {
  drinks: MarketDrink[];
  event: EventConfig;
  bolsa: BolsaConfig;
  marketPaused: boolean;
  sales: Sale[];
  setEvent: (e: EventConfig) => void;
  setBolsa: (b: BolsaConfig) => void;
  setMarketPaused: (p: boolean) => void;
  updateDrink: <K extends keyof MarketDrink>(id: string, key: K, value: MarketDrink[K]) => void;
  adjustPrice: (id: string, delta: number) => void;
  triggerCrash: (id: string) => void;
  togglePauseDrink: (id: string) => void;
  recordSale: (drinkId: string) => void;
  clearSales: () => void;
};

const WINDOW_MS = 90_000;
const SALES_STORAGE_KEY = "808live.sales.v1";

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

export function MarketProvider({ children }: { children: ReactNode }) {
  const [drinks, setDrinks] = useState<MarketDrink[]>(INITIAL_DRINKS);
  const [event, setEvent] = useState<EventConfig>({
    name: "808Live · Rooftop Sessions",
    date: "2026-06-21",
    startTime: "22:00",
    endTime: "04:00",
  });
  const [bolsa, setBolsa] = useState<BolsaConfig>({
    open: true, frequency: 3, intensity: 15, opportunityWindow: 8,
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

  // Persist sales + listen for cross-tab/storage updates
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales));
    } catch {
      /* ignore */
    }
  }, [sales]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SALES_STORAGE_KEY || !e.newValue) return;
      try {
        setSales(JSON.parse(e.newValue) as Sale[]);
      } catch {
        /* ignore */
      }
    };
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<Sale>).detail;
      if (detail) setSales((prev) => (prev.find((s) => s.id === detail.id) ? prev : [...prev, detail]));
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("808live:sale", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("808live:sale", onCustom as EventListener);
    };
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
          // crash auto-recover
          if (d.crashUntil && Date.now() >= d.crashUntil) {
            const restored = d.base;
            return { ...d, prev: d.price, price: restored, history: [...d.history.slice(-17), restored], crashUntil: null };
          }
          const magnitude = (b.intensity / 100) * d.base; // max swing per tick
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

  // Tick crash recovery even when market closed
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
    drinks, event, bolsa, marketPaused, sales,
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
    clearSales: () => setSales([]),
  }), [drinks, event, bolsa, marketPaused, sales]);

  return <MarketCtx.Provider value={value}>{children}</MarketCtx.Provider>;
}

export function useMarket() {
  const ctx = useContext(MarketCtx);
  if (!ctx) throw new Error("useMarket must be used inside <MarketProvider>");
  return ctx;
}
