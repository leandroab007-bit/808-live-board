import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PublicScreen } from "@/components/views/PublicScreen";
import { AdminScreen } from "@/components/views/AdminScreen";
import { ClientApp } from "@/components/views/ClientApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "808 LIVE — A Bolsa de Valores do seu Drink" },
      { name: "description", content: "Painel LED ao vivo de cotações de drinks. Trave seu preço antes que suba." },
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
  component: PrototypeShell,
});

type ViewKey = "public" | "admin" | "client";

const TABS: { key: ViewKey; label: string; icon: string; color: "cyan" | "lime" | "magenta" }[] = [
  { key: "client", label: "App do Cliente", icon: "📱", color: "magenta" },
  { key: "admin", label: "Painel do Produtor (Admin)", icon: "⚙️", color: "lime" },
  { key: "public", label: "Telão (Opcional)", icon: "📺", color: "cyan" },
];

function PrototypeShell() {
  const [view, setView] = useState<ViewKey>("client");

  return (
    <div className="flex h-screen w-screen flex-col bg-background overflow-hidden">
      {/* Top nav */}
      <nav className="relative z-50 shrink-0 border-b border-panel-border bg-black/80 backdrop-blur px-4 py-2 flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-panel-border">
          <span className="h-2 w-2 rounded-full bg-neon-magenta animate-blink-dot shadow-[0_0_10px_var(--neon-magenta)]" />
          <span className="font-display font-black text-sm tracking-[0.25em] text-neon-cyan text-glow-cyan">
            808LIVE
          </span>
          <span className="font-body text-[10px] tracking-widest text-muted-foreground hidden sm:inline">
            PROTÓTIPO
          </span>
        </div>

        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          {TABS.map((t) => {
            const active = view === t.key;
            const palette = {
              cyan: {
                on: "border-neon-cyan bg-neon-cyan/15 text-neon-cyan text-glow-cyan shadow-[0_0_18px_oklch(0.85_0.18_220/0.5)]",
                off: "border-panel-border text-muted-foreground hover:border-neon-cyan/60 hover:text-neon-cyan",
              },
              lime: {
                on: "border-neon-lime bg-neon-lime/15 text-neon-lime text-glow-lime shadow-[0_0_18px_oklch(0.82_0.28_145/0.5)]",
                off: "border-panel-border text-muted-foreground hover:border-neon-lime/60 hover:text-neon-lime",
              },
              magenta: {
                on: "border-neon-magenta bg-neon-magenta/15 text-neon-magenta text-glow-magenta shadow-[0_0_18px_oklch(0.7_0.32_340/0.5)]",
                off: "border-panel-border text-muted-foreground hover:border-neon-magenta/60 hover:text-neon-magenta",
              },
            }[t.color];
            return (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                className={`font-display font-bold text-xs md:text-sm tracking-[0.15em] uppercase px-3 md:px-4 py-2 rounded-md border transition-all whitespace-nowrap ${
                  active ? palette.on : palette.off
                }`}
              >
                <span className="mr-1.5">{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        <span className="font-display text-[10px] tracking-widest text-muted-foreground hidden md:inline">
          DEMO MODE
        </span>
      </nav>

      {/* View area */}
      <div className="flex-1 min-h-0 relative">
        {view === "public" && <PublicScreen />}
        {view === "admin" && <AdminScreen />}
        {view === "client" && <ClientApp />}
      </div>
    </div>
  );
}
