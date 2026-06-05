import type { CSSProperties } from 'react';

export interface ShelfTheme {
  id: string;
  label: string;
  needsColor?: boolean;
  board: { className?: string; style?: CSSProperties };
  cellBase: string;
  labelClass: string;
  plank?: string;
  swatch: CSSProperties;
}

export const SHELF_THEMES: ShelfTheme[] = [
  {
    id: 'default',
    label: 'Padrão',
    board: { className: '' },
    cellBase: 'border-2 border-dashed border-muted-foreground/25 bg-muted/10 hover:border-muted-foreground/40',
    labelClass: 'text-muted-foreground',
    swatch: { background: 'transparent', border: '1px solid #e2e8f0' },
  },
  {
    id: 'wood',
    label: 'Madeira',
    board: {
      className: 'rounded-xl border-2 border-amber-950/70 p-3',
      style: {
        background: `
          repeating-linear-gradient(
            93deg,
            rgba(50,20,3,0.22) 0px,
            rgba(160,90,25,0.06) 4px,
            rgba(50,20,3,0.16) 11px,
            transparent 18px,
            rgba(40,15,2,0.24) 26px,
            rgba(190,120,40,0.07) 30px,
            rgba(40,15,2,0.18) 39px,
            transparent 50px
          ),
          repeating-linear-gradient(
            89deg,
            rgba(0,0,0,0.08) 0px,
            transparent 1px,
            rgba(0,0,0,0.05) 3px,
            transparent 5px,
            rgba(220,155,65,0.10) 8px,
            transparent 11px
          ),
          linear-gradient(
            180deg,
            #cc9540 0%,
            #a56c20 28%,
            #8a5618 52%,
            #b27a28 72%,
            #c48c38 100%
          )
        `,
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.35), inset 0 -2px 5px rgba(0,0,0,0.2)',
      },
    },
    cellBase: 'bg-amber-900/20 border border-amber-950/40 hover:bg-amber-900/30',
    labelClass: 'text-amber-100/90',
    plank: 'border-b-[3px] border-amber-950/60 shadow-[0_3px_0_rgba(0,0,0,0.35)]',
    swatch: {
      background: `
        repeating-linear-gradient(93deg, rgba(50,20,3,0.28) 0px, transparent 9px, rgba(40,15,2,0.24) 22px, transparent 34px),
        linear-gradient(135deg, #cc9540 0%, #8a5618 55%, #b27a28 100%)
      `,
      border: '1px solid #5a2e0a',
    },
  },
  {
    id: 'solid',
    label: 'Cor sólida',
    needsColor: true,
    board: { className: 'rounded-xl p-3 shadow-inner' },
    cellBase: 'bg-white/10 border border-white/20 hover:bg-white/20',
    labelClass: 'text-white/80',
    swatch: { background: '#475569', border: '1px solid #334155' },
  },
  {
    id: 'slate',
    label: 'Ardósia',
    board: { className: 'rounded-xl bg-slate-800 p-3 shadow-inner border border-slate-700' },
    cellBase: 'bg-white/5 border border-white/10 hover:bg-white/10',
    labelClass: 'text-slate-300',
    swatch: { background: '#1e293b', border: '1px solid #334155' },
  },
];

export function getShelfTheme(id?: string): ShelfTheme {
  return SHELF_THEMES.find(t => t.id === id) ?? SHELF_THEMES[0];
}
