import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "808 LIVE — Mesa de Operações do Produtor" },
      { name: "description", content: "Painel de controle do produtor 808Live." },
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
  component: AdminPanel,
});

type AdminDrink = {
  id: string;
  name: string;
  price: number;
  base: number;
  stock: number;
  crashUntil: number | null;
};

const INITIAL: AdminDrink[] = [
  { id: "gin", name: "GIN TÔNICA", price: 19.9, base: 19.9, stock: 85, crashUntil: null },
  { id: "cerveja", name: "CERVEJA LONG NECK", price: 14.0, base: 14.0, stock: 62, crashUntil: null },
  { id: "vodka", name: "VODKA ENERGÉTICO", price: 24.0, base: 24.0, stock: 45, crashUntil: null },
  { id: "caipirinha", name: "CAIPIRINHA", price: 18.5, base: 18.5, stock: 30, crashUntil: null },
];

function AdminPanel() {
  const [drinks, setDrinks] = useState<AdminDrink[]>(INITIAL);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const adjustPrice = (id: string, delta: number) => {
    setDrinks((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, price: Math.max(1, Number((d.price + delta).toFixed(2))) }
          : d,
      ),
    );
  };

  const triggerCrash = (id: string) => {
    setDrinks((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              price: Number((d.price * 0.5).toFixed(2)),
              crashUntil: Date.now() + 120_000,
            }
          : d,
      ),
    );
  };

  useEffect(() => {
    const id = setInterval(() => {
      setDrinks((prev) =>
        prev.map((d) => {
          if (d.crashUntil && Date.now() >= d.crashUntil) {
            return { ...d, price: d.base, crashUntil: null };
          }
          return d;
        }),
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const formatPrice = (n: number) => `R$ ${n.toFixed(2).replace(".", ",")}`;

  const getCrashRemaining = (crashUntil: number | null) => {
    if (!crashUntil) return 0;
    return Math.max(0, Math.ceil((crashUntil - now) / 1000));
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 scanlines z-50" />
      <div className="pointer-events-none absolute inset-0 z-40 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)]" />

      <div className="relative z-10 flex h-full flex-col p-4 gap-3">
        {/* HEADER */}
        <header className="panel-card rounded-lg px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-neon-lime animate-blink-dot shadow-[0_0_15px_var(--neon-lime)]" />
            <span className="font-display text-xs tracking-[0.3em] text-neon-lime">ADMIN</span>
          </div>
          <h1 className="font-display font-black text-xl md:text-3xl tracking-[0.15em] text-center text-glow-cyan text-neon-cyan">
            PAINEL DE CONTROLE <span className="text-muted-foreground">|</span>{" "}
            <span className="text-neon-lime text-glow-lime">808LIVE</span>
          </h1>
          <Link
            to="/"
            className="font-display text-xs tracking-widest text-neon-red hover:text-neon-magenta transition-colors"
          >
            LOGOUT
          </Link>
        </header>

        {/* GRID */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-1 min-h-0">
          {drinks.map((d) => {
            const crashSec = getCrashRemaining(d.crashUntil);
            const isCrashed = crashSec > 0;
            return (
              <div key={d.id} className="panel-card rounded-lg p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-panel-border pb-2">
                  <span className="font-display font-bold tracking-wider text-lg text-neon-cyan">
                    {d.name}
                  </span>
                  {isCrashed && (
                    <span className="font-display text-[10px] tracking-widest text-neon-red animate-blink-dot">
                      CRASH 00:{crashSec.toString().padStart(2, "0")}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-body text-xs tracking-widest text-muted-foreground">
                    PREÇO ATUAL
                  </span>
                  <span
                    className={`font-display font-black text-4xl tabular-nums ${
                      isCrashed
                        ? "text-neon-red animate-price-flash"
                        : "text-neon-lime text-glow-lime"
                    }`}
                  >
                    {formatPrice(d.price)}
                  </span>
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => adjustPrice(d.id, 1)}
                      className="flex-1 font-display font-bold text-sm py-3 rounded-md bg-neon-blue/20 border border-neon-blue text-neon-blue hover:bg-neon-blue/30 transition-colors"
                    >
                      + R$ 1,00
                    </button>
                    <button
                      onClick={() => adjustPrice(d.id, -1)}
                      className="flex-1 font-display font-bold text-sm py-3 rounded-md bg-neon-magenta/20 border border-neon-magenta text-neon-magenta hover:bg-neon-magenta/30 transition-colors"
                    >
                      - R$ 1,00
                    </button>
                  </div>
                  <button
                    onClick={() => triggerCrash(d.id)}
                    disabled={isCrashed}
                    className="w-full font-display font-bold text-sm py-3 rounded-md bg-neon-red/20 border border-neon-red text-neon-red hover:bg-neon-red/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ⚠️ MARKET CRASH
                  </button>
                </div>

                {/* Stock */}
                <div className="flex flex-col gap-1 mt-auto">
                  <div className="flex items-center justify-between">
                    <span className="font-body text-xs tracking-widest text-muted-foreground">
                      ESTOQUE
                    </span>
                    <span className="font-display text-xs text-neon-cyan">{d.stock}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-panel-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-neon-lime shadow-[0_0_8px_var(--neon-lime)]"
                      style={{ width: `${d.stock}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* FOOTER */}
        <footer className="flex justify-center">
          <button
            onClick={() => setPaused((p) => !p)}
            className={`font-display font-black text-xl md:text-2xl tracking-[0.2em] px-12 py-4 rounded-lg border-2 transition-all ${
              paused
                ? "border-neon-red text-neon-red bg-neon-red/10 animate-price-flash"
                : "border-neon-lime text-neon-lime bg-neon-lime/10 hover:bg-neon-lime/20"
            }`}
          >
            {paused ? "BOLSA PAUSADA" : "PAUSAR BOLSA"}
          </button>
        </footer>
      </div>
    </main>
  );
}
