import { useMemo } from "react";

/**
 * Kit de Marketing — galeria de mockups estáticos para divulgação do 808Live.
 * Não conecta com nenhuma lógica do sistema. Apenas materiais visuais.
 */

// SVG QR code "fake" — gera um padrão determinístico estilo QR, puramente visual
function FakeQR({ size = 180, fg = "#000", bg = "#fff", seed = "808LIVE" }: { size?: number; fg?: string; bg?: string; seed?: string }) {
  const cells = 25;
  const cellSize = size / cells;
  const grid = useMemo(() => {
    // hash determinístico simples
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    const rand = (x: number, y: number) => {
      let n = (h ^ (x * 73856093) ^ (y * 19349663)) >>> 0;
      n ^= n << 13; n ^= n >>> 17; n ^= n << 5;
      return ((n >>> 0) % 1000) / 1000;
    };
    const g: boolean[][] = [];
    for (let y = 0; y < cells; y++) {
      g[y] = [];
      for (let x = 0; x < cells; x++) g[y][x] = rand(x, y) > 0.52;
    }
    // limpa áreas dos finders
    const clearFinder = (ox: number, oy: number) => {
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) g[oy + y][ox + x] = false;
    };
    clearFinder(0, 0); clearFinder(cells - 7, 0); clearFinder(0, cells - 7);
    return g;
  }, [seed]);

  const Finder = ({ x, y }: { x: number; y: number }) => (
    <g transform={`translate(${x * cellSize} ${y * cellSize})`}>
      <rect width={cellSize * 7} height={cellSize * 7} fill={fg} />
      <rect x={cellSize} y={cellSize} width={cellSize * 5} height={cellSize * 5} fill={bg} />
      <rect x={cellSize * 2} y={cellSize * 2} width={cellSize * 3} height={cellSize * 3} fill={fg} />
    </g>
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-sm">
      <rect width={size} height={size} fill={bg} />
      {grid.map((row, y) =>
        row.map((on, x) =>
          on ? <rect key={`${x}-${y}`} x={x * cellSize} y={y * cellSize} width={cellSize} height={cellSize} fill={fg} /> : null,
        ),
      )}
      <Finder x={0} y={0} />
      <Finder x={cells - 7} y={0} />
      <Finder x={0} y={cells - 7} />
    </svg>
  );
}

function LogoMark({ size = "text-2xl" }: { size?: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-neon-magenta shadow-[0_0_10px_var(--neon-magenta)]" />
      <span className={`font-display font-black tracking-[0.25em] text-neon-cyan text-glow-cyan ${size}`}>
        808LIVE
      </span>
    </div>
  );
}

function TickerStrip() {
  return (
    <div className="overflow-hidden border-y border-neon-cyan/30 bg-black/60 py-1">
      <div className="flex gap-6 whitespace-nowrap font-display text-[10px] tracking-widest">
        {["GIN ▲ 18.00", "VODKA ▼ 14.50", "CERVEJA ▲ 9.00", "CAIPIRINHA ▼ 16.00", "COMBO ▲ 32.00"].map((t, i) => (
          <span key={i} className={i % 2 ? "text-neon-magenta" : "text-neon-cyan"}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

function MockupFrame({
  label,
  spec,
  children,
}: {
  label: string;
  spec: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel-card rounded-xl p-5 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="font-display font-bold text-sm tracking-[0.2em] text-neon-cyan text-glow-cyan uppercase">
            {label}
          </div>
          <div className="font-body text-[11px] tracking-widest text-muted-foreground uppercase">{spec}</div>
        </div>
        <button className="font-display text-[10px] tracking-widest border border-panel-border rounded px-2 py-1 text-muted-foreground hover:border-neon-magenta hover:text-neon-magenta transition-colors">
          PNG ↓
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center bg-black/40 rounded-lg p-4 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/* ============ MOCKUPS ============ */

function BannerVertical() {
  return (
    <div
      className="relative bg-black overflow-hidden border border-neon-cyan/40 shadow-[0_0_40px_#ffb02040]"
      style={{ width: 260, height: 390 }}
    >
      <div className="scanlines absolute inset-0 pointer-events-none opacity-50" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(circle at 20% 10%, #ff8a1f66, transparent 50%), radial-gradient(circle at 80% 90%, #ffb02066, transparent 50%)",
        }}
      />
      <div className="relative h-full flex flex-col p-4">
        <LogoMark size="text-xl" />
        <div className="mt-3">
          <div className="font-display font-black text-[22px] leading-tight text-white">
            A BOLSA DE<br />
            <span className="text-neon-magenta text-glow-magenta">VALORES</span><br />
            DOS DRINKS
          </div>
        </div>
        <div className="mt-3 space-y-1.5 font-body font-semibold text-[12px] text-white/90">
          <div>📉 Preços mudam ao vivo</div>
          <div className="text-neon-magenta">🔥 Descontos surpresa</div>
          <div className="text-neon-cyan">⚡ Trave antes que suba</div>
          <div>🍺 Drinks, cervejas e combos</div>
        </div>
        <div className="mt-3 mb-2">
          <TickerStrip />
        </div>
        <div className="flex-1 flex flex-col items-center justify-end gap-2">
          <div className="font-display font-bold text-[11px] tracking-[0.2em] text-neon-cyan uppercase text-center">
            Escaneie e entre agora
          </div>
          <div className="p-2 bg-white rounded">
            <FakeQR size={110} seed="808-banner" />
          </div>
          <div className="font-display text-[9px] tracking-[0.3em] text-muted-foreground uppercase">
            Sem app para baixar
          </div>
        </div>
      </div>
    </div>
  );
}

function CartazA3() {
  return (
    <div
      className="relative bg-black overflow-hidden border border-neon-magenta/40 shadow-[0_0_40px_#ff8a1f40]"
      style={{ width: 280, height: 396 }}
    >
      <div className="scanlines absolute inset-0 pointer-events-none opacity-40" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "linear-gradient(135deg, #ff8a1f4c, transparent 40%, #ffb0204c)",
        }}
      />
      <div className="relative h-full flex flex-col items-center justify-between p-6 text-center">
        <LogoMark size="text-2xl" />
        <div>
          <div className="font-display font-black text-[20px] leading-tight text-white">
            ACOMPANHE OS PREÇOS
          </div>
          <div className="font-display font-black text-[24px] text-neon-cyan text-glow-cyan">
            EM TEMPO REAL
          </div>
        </div>
        <div className="p-3 bg-white rounded">
          <FakeQR size={140} seed="808-cartaz" />
        </div>
        <div className="font-display font-bold text-[13px] tracking-[0.15em] text-neon-magenta text-glow-magenta uppercase">
          Escaneie e entre na<br />Bolsa dos Drinks
        </div>
        <div className="font-display text-[9px] tracking-[0.3em] text-muted-foreground uppercase">
          808live.app
        </div>
      </div>
    </div>
  );
}

function DisplayBalcao() {
  return (
    <div
      className="relative bg-black overflow-hidden border border-neon-cyan/50 shadow-[0_0_30px_#ffb0204c] rounded-md"
      style={{ width: 260, height: 200 }}
    >
      <div className="scanlines absolute inset-0 pointer-events-none opacity-40" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(circle at 80% 20%, #ff8a1f59, transparent 60%)",
        }}
      />
      <div className="relative h-full flex items-center gap-4 p-4">
        <div className="p-2 bg-white rounded">
          <FakeQR size={110} seed="808-display" />
        </div>
        <div className="flex-1 flex flex-col">
          <LogoMark size="text-lg" />
          <div className="font-display font-black text-[16px] leading-tight text-white mt-2">
            ENTRE NA<br />
            <span className="text-neon-cyan text-glow-cyan">BOLSA DOS<br />DRINKS</span>
          </div>
          <div className="font-body font-semibold text-[10px] text-neon-magenta mt-2 uppercase tracking-wide">
            Trave preços antes que subam
          </div>
        </div>
      </div>
    </div>
  );
}

function InstagramStory() {
  return (
    <div
      className="relative bg-black overflow-hidden border border-neon-magenta/40 shadow-[0_0_40px_#ff8a1f4c]"
      style={{ width: 200, height: 356 }}
    >
      <div className="scanlines absolute inset-0 pointer-events-none opacity-50" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #ff8a1f66 0%, transparent 30%, transparent 70%, #ffb02066 100%)",
        }}
      />
      <div className="relative h-full flex flex-col items-center p-4 text-center">
        <div className="flex items-center gap-1.5 mt-1">
          <span className="h-1.5 w-1.5 rounded-full bg-neon-magenta animate-blink-dot" />
          <span className="font-display text-[8px] tracking-[0.3em] text-white/80">AO VIVO</span>
        </div>
        <LogoMark size="text-base" />
        <div className="mt-2 font-display font-black text-[14px] leading-tight text-white">
          A BOLSA DE VALORES<br />
          <span className="text-neon-cyan text-glow-cyan">DOS DRINKS</span>
        </div>
        <div className="mt-3 space-y-1 font-display font-bold text-[9px] tracking-widest text-white/90 uppercase">
          <div>📉 Preços oscilando ao vivo</div>
          <div className="text-neon-magenta">🔥 Descontos surpresa</div>
          <div className="text-neon-cyan">⚡ Trave o preço</div>
        </div>
        <div className="mt-3 p-1.5 bg-white rounded">
          <FakeQR size={90} seed="808-story" />
        </div>
        <div className="mt-2 font-display font-black text-[10px] tracking-[0.25em] text-neon-magenta text-glow-magenta uppercase">
          Escaneie e participe
        </div>
        <div className="mt-auto font-display text-[7px] tracking-[0.3em] text-muted-foreground uppercase">
          @808live · stories
        </div>
      </div>
    </div>
  );
}

function InstagramPost() {
  return (
    <div
      className="relative bg-black overflow-hidden border border-neon-cyan/40 shadow-[0_0_30px_#ffb02040]"
      style={{ width: 280, height: 280 }}
    >
      <div className="scanlines absolute inset-0 pointer-events-none opacity-40" />
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(circle at 100% 0%, #ff8a1f73, transparent 50%), radial-gradient(circle at 0% 100%, #ffb02073, transparent 50%)",
        }}
      />
      <div className="relative h-full flex flex-col justify-between p-5">
        <div className="flex items-center justify-between">
          <LogoMark size="text-base" />
          <span className="font-display text-[8px] tracking-[0.3em] text-neon-magenta">#808LIVE</span>
        </div>
        <div>
          <div className="font-display font-black text-[22px] leading-[1.05] text-white">
            BEBIDAS COM<br />
            <span className="text-neon-cyan text-glow-cyan">PREÇOS</span><br />
            <span className="text-neon-magenta text-glow-magenta">VARIÁVEIS</span><br />
            EM TEMPO REAL.
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div className="font-display font-bold text-[10px] tracking-[0.2em] text-white/80 uppercase leading-tight">
            Escaneie.<br />
            Acompanhe.<br />
            <span className="text-neon-cyan">Trave.</span><br />
            <span className="text-neon-magenta">Economize.</span>
          </div>
          <div className="p-1.5 bg-white rounded">
            <FakeQR size={80} seed="808-post" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ MAIN ============ */

export function MarketingKit() {
  return (
    <div className="h-full w-full overflow-y-auto bg-background">
      {/* header */}
      <div className="sticky top-0 z-10 border-b border-panel-border bg-black/80 backdrop-blur px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="font-display font-black text-xl tracking-[0.2em] text-neon-magenta text-glow-magenta uppercase">
              Kit de Marketing
            </div>
            <div className="font-body text-xs tracking-widest text-muted-foreground uppercase mt-1">
              Materiais de divulgação para eventos sem TV ou telão
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display text-[10px] tracking-widest text-neon-cyan uppercase border border-neon-cyan/40 rounded px-2 py-1">
              5 PEÇAS
            </span>
            <span className="font-display text-[10px] tracking-widest text-muted-foreground uppercase border border-panel-border rounded px-2 py-1">
              MOCKUPS ESTÁTICOS
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-[1600px] mx-auto">
        <MockupFrame label="Banner Vertical" spec="60 × 90 cm · Impresso">
          <BannerVertical />
        </MockupFrame>

        <MockupFrame label="Cartaz A3" spec="29.7 × 42 cm · Parede / Entrada">
          <CartazA3 />
        </MockupFrame>

        <MockupFrame label="Display de Balcão" spec="A5 · Mesas e Bares">
          <DisplayBalcao />
        </MockupFrame>

        <MockupFrame label="Instagram Story" spec="1080 × 1920 · Vertical">
          <InstagramStory />
        </MockupFrame>

        <MockupFrame label="Post Feed Instagram" spec="1080 × 1080 · Quadrado">
          <InstagramPost />
        </MockupFrame>

        <div className="panel-card rounded-xl p-6 flex flex-col justify-between border-dashed">
          <div>
            <div className="font-display font-bold text-sm tracking-[0.2em] text-neon-cyan text-glow-cyan uppercase">
              Como usar
            </div>
            <ul className="mt-4 space-y-3 font-body text-sm text-white/80">
              <li className="flex gap-2"><span className="text-neon-magenta">01.</span> Baixe os materiais em alta resolução.</li>
              <li className="flex gap-2"><span className="text-neon-magenta">02.</span> Imprima para banners, cartazes e displays.</li>
              <li className="flex gap-2"><span className="text-neon-magenta">03.</span> Publique stories e posts no Instagram do evento.</li>
              <li className="flex gap-2"><span className="text-neon-magenta">04.</span> Posicione QR Codes próximos ao bar.</li>
            </ul>
          </div>
          <div className="mt-6 pt-4 border-t border-panel-border font-display text-[10px] tracking-[0.3em] text-muted-foreground uppercase">
            808live · brand kit v1.0
          </div>
        </div>
      </div>
    </div>
  );
}
