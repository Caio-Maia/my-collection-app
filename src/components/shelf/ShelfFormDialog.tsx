import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { cn } from '../../lib/utils';
import { SHELF_THEMES } from './shelfThemes';
import { COVER_COLORS } from '../../lib/constants';
import type { Shelf } from '../../types';

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  rows: z.number().int().min(1).max(20),
  cols: z.number().int().min(1).max(20),
  theme: z.string(),
  theme_color: z.string(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
  initial?: Pick<Shelf, 'name' | 'rows' | 'cols' | 'theme' | 'theme_color'>;
  onSubmit(data: FormValues): Promise<unknown>;
  loading?: boolean;
}

export function ShelfFormDialog({ open, onOpenChange, initial, onSubmit, loading }: Props) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? { name: '', rows: 4, cols: 6, theme: 'default', theme_color: '' },
  });

  useEffect(() => {
    if (open) reset(initial ?? { name: '', rows: 4, cols: 6, theme: 'default', theme_color: '' });
  }, [open, initial, reset]);

  const selectedTheme = watch('theme');
  const selectedColor = watch('theme_color');
  const needsColor = SHELF_THEMES.find(t => t.id === selectedTheme)?.needsColor ?? false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar estante' : 'Nova estante'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome</Label>
            <Input id="name" placeholder="Ex: Sala, Quarto..." {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Linhas × Colunas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rows">Linhas</Label>
              <Input id="rows" type="number" min={1} max={20} {...register('rows', { valueAsNumber: true })} />
              {errors.rows && <p className="text-xs text-destructive">{errors.rows.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cols">Colunas</Label>
              <Input id="cols" type="number" min={1} max={20} {...register('cols', { valueAsNumber: true })} />
              {errors.cols && <p className="text-xs text-destructive">{errors.cols.message}</p>}
            </div>
          </div>

          {/* Seletor de tema */}
          <div className="space-y-2">
            <Label>Estilo</Label>
            <div className="grid grid-cols-2 gap-2">
              {SHELF_THEMES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setValue('theme', t.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border-2 p-2.5 transition-all text-xs font-medium',
                    selectedTheme === t.id
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-input hover:border-primary/40',
                  )}
                >
                  {/* Swatch mini-preview */}
                  <div
                    className="w-full h-10 rounded-md flex items-center justify-center gap-1 overflow-hidden"
                    style={{
                      ...t.swatch,
                      ...(t.id === 'solid' && selectedColor ? { background: selectedColor } : {}),
                    }}
                  >
                    <div className={cn('h-6 w-7 rounded-sm opacity-60', t.cellBase.split(' ')[0])}
                      style={{ border: '1px solid rgba(255,255,255,0.3)' }} />
                    <div className={cn('h-6 w-7 rounded-sm opacity-60', t.cellBase.split(' ')[0])}
                      style={{ border: '1px solid rgba(255,255,255,0.3)' }} />
                  </div>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Paleta de cor (apenas para tema solid) */}
          {needsColor && (
            <div className="space-y-2">
              <Label>Cor da estante</Label>
              <div className="flex flex-wrap gap-2 items-center">
                {COVER_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    title={color}
                    onClick={() => setValue('theme_color', selectedColor === color ? '' : color)}
                    className={cn(
                      'h-7 w-7 rounded-full transition-all ring-1 ring-black/10',
                      selectedColor === color
                        ? 'ring-2 ring-offset-2 ring-primary scale-110'
                        : 'hover:scale-110',
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
                {selectedColor && (
                  <button
                    type="button"
                    title="Remover cor"
                    onClick={() => setValue('theme_color', '')}
                    className="h-7 w-7 rounded-full border border-input flex items-center justify-center hover:bg-accent transition-colors"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
