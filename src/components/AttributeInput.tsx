import { useState } from 'react';
import { Input } from './ui/input';
import { cn } from '../lib/utils';
import type { AttributeType } from '../types';

// ── Duration helpers ──────────────────────────────────────────────────────────

/** Parse any human duration string to total minutes. Returns null if unparseable. */
export function parseDuration(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return null;

  // hh:mm  or  h:mm  (optionally :ss at end)
  const colonMatch = s.match(/^(\d+):(\d{1,2})(?::\d{1,2})?$/);
  if (colonMatch) {
    const total = parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
    return isNaN(total) ? null : total;
  }

  // Xh Ymin  /  XhYm  /  Xh Y
  const hmMatch = s.match(/^(\d+)\s*h\s*(\d+)\s*(?:min|m)?$/);
  if (hmMatch) return parseInt(hmMatch[1]) * 60 + parseInt(hmMatch[2]);

  // Xh
  const hMatch = s.match(/^(\d+)\s*h$/);
  if (hMatch) return parseInt(hMatch[1]) * 60;

  // Xmin  /  Xm
  const mMatch = s.match(/^(\d+)\s*(?:min|m)$/);
  if (mMatch) return parseInt(mMatch[1]);

  // plain integer (assumed minutes)
  const n = parseInt(s);
  if (!isNaN(n) && n >= 0) return n;

  return null;
}

/** Format total minutes to a readable string. */
export function formatDuration(minutes: number): string {
  if (!isFinite(minutes) || minutes < 0) return '';
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

// ── DurationInput ─────────────────────────────────────────────────────────────

interface DurationInputProps {
  value: string;                  // stored as plain minutes string, e.g. "120"
  onChange(value: string): void;
  placeholder?: string;
  className?: string;
}

function DurationInput({ value, onChange, placeholder, className }: DurationInputProps) {
  const storedMinutes = value !== '' ? parseInt(value) : NaN;
  const formatted = !isNaN(storedMinutes) ? formatDuration(storedMinutes) : value;

  const [focused, setFocused] = useState(false);
  const [inputVal, setInputVal] = useState('');

  const handleFocus = () => {
    setFocused(true);
    setInputVal(formatted); // start editing from the formatted value
  };

  const handleBlur = () => {
    setFocused(false);
    if (inputVal.trim() === '') { onChange(''); return; }
    const parsed = parseDuration(inputVal);
    if (parsed !== null) onChange(String(parsed));
    // if unparseable, silently keep the previous stored value
  };

  return (
    <Input
      value={focused ? inputVal : formatted}
      onChange={e => setInputVal(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder ?? 'Ex: 2h 30min ou 1:30'}
      className={className}
      title="Formatos aceitos: 2h, 1:30, 2h 30min, 90min, 150"
    />
  );
}

// ── AttributeInput ────────────────────────────────────────────────────────────

interface Props {
  type?: AttributeType;
  value: string;
  onChange(value: string): void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

export function AttributeInput({ type = 'text', value, onChange, suggestions = [], placeholder, className }: Props) {
  const [open, setOpen] = useState(false);

  // Year: plain number input, NO autocomplete
  if (type === 'year') {
    return (
      <Input
        type="number"
        min={1800}
        max={2200}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'Ex: 1985'}
        className={className}
      />
    );
  }

  // Duration: smart format parser/formatter
  if (type === 'duration') {
    return <DurationInput value={value} onChange={onChange} placeholder={placeholder} className={className} />;
  }

  // text / person: autocomplete dropdown
  const filtered = value.length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()) && s !== value).slice(0, 8)
    : suggestions.slice(0, 8);

  return (
    <div className={cn('relative', className)}>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md overflow-hidden">
          {filtered.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={() => { onChange(s); setOpen(false); }}
              className="flex w-full items-center px-3 py-2 text-sm hover:bg-accent text-left"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
