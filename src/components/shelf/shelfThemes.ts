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
      className: 'rounded-xl border-2 border-amber-900/60 shadow-inner p-3',
      style: {
        background: `
          repeating-linear-gradient(
            92deg,
            rgba(120,70,20,0.06) 0px,
            rgba(180,110,40,0.10) 2px,
            rgba(140,80,25,0.04) 5px,
            rgba(160,100,35,0.08) 9px,
            transparent 12px
          ),
          linear-gradient(180deg, #b5813a 0%, #9a6b2c 40%, #8a5e24 70%, #a07030 100%)
        `,
      },
    },
    cellBase: 'bg-amber-50/10 border border-amber-900/30 hover:bg-amber-50/20',
    labelClass: 'text-amber-100/80',
    plank: 'border-b-4 border-amber-950/50 shadow-[0_3px_0_rgba(0,0,0,0.3)]',
    swatch: {
      background: 'linear-gradient(135deg, #b5813a 0%, #8a5e24 60%, #a07030 100%)',
      border: '1px solid #7a4f1a',
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
