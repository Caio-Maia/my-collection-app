import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, Trash2, ChevronDown, ChevronUp, X,
  BookOpen, Disc, Film, Music, Star, Heart, Gamepad2,
  Camera, Shirt, Wine, Trophy, Puzzle, Globe, Leaf,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { cn } from '../lib/utils';
import type { Collection, AttributeSchema } from '../types';

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen, Disc, Film, Music, Star, Heart, Gamepad2,
  Camera, Shirt, Wine, Trophy, Puzzle, Globe, Leaf,
};

const ICONS = Object.keys(ICON_MAP);

import { COVER_COLORS, imageUrlSchema } from '../lib/constants';

const ATTR_TYPES = [
  { value: 'text',     label: 'Texto'                 },
  { value: 'person',   label: 'Pessoa (autocomplete)' },
  { value: 'year',     label: 'Ano (número)'          },
  { value: 'duration', label: 'Duração (minutos)'     },
] as const;

const schema = z.object({
  name:         z.string().min(1, 'Nome é obrigatório'),
  description:  z.string(),
  icon:         z.string(),
  cover_color:  z.string(),
  cover_image:  imageUrlSchema,
  attr_schema:  z.array(z.object({
    key:  z.string(),
    type: z.enum(['text', 'person', 'year', 'duration']),
  })),
});

type FormData = z.infer<typeof schema>;

interface Props {
  initial?: Partial<Collection>;
  onSubmit(data: Omit<Collection, 'id' | 'user_id' | 'created_at'>): Promise<unknown>;
  onCancel(): void;
  loading?: boolean;
}

function CollapsibleSection({
  title, open, onToggle, children,
}: { title: React.ReactNode; open: boolean; onToggle(): void; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-accent/50 transition-colors rounded-lg"
        onClick={onToggle}
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3 border-t pt-3">{children}</div>}
    </div>
  );
}

export function CollectionForm({ initial, onSubmit, onCancel, loading }: Props) {
  const [schemaOpen,     setSchemaOpen]     = useState(Object.keys(initial?.attribute_schema ?? {}).length > 0);
  const [appearanceOpen, setAppearanceOpen] = useState(!!(initial?.cover_color || initial?.cover_image));

  const existingSchema = Object.entries(initial?.attribute_schema ?? {}).map(([key, cfg]) => ({ key, type: cfg.type }));

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:        initial?.name        ?? '',
      description: initial?.description ?? '',
      icon:        initial?.icon        ?? 'BookOpen',
      cover_color: initial?.cover_color ?? '',
      cover_image: initial?.cover_image ?? '',
      attr_schema: existingSchema,
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'attr_schema' });

  const selectedIcon  = form.watch('icon');
  const coverColor    = form.watch('cover_color');
  const coverImage    = form.watch('cover_image');

  const handleSubmit = (values: FormData) => {
    const attribute_schema: AttributeSchema = {};
    values.attr_schema.forEach(({ key, type }) => {
      if (key.trim()) attribute_schema[key.trim()] = { type };
    });
    return onSubmit({
      name:        values.name,
      description: values.description,
      icon:        values.icon,
      cover_color: values.cover_color,
      cover_image: values.cover_image,
      attribute_schema,
      is_public: initial?.is_public ?? false,
    });
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="col-name">Nome *</Label>
        <Input id="col-name" {...form.register('name')} placeholder="Ex: Livros de Ficção" />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="col-desc">Descrição</Label>
        <Textarea id="col-desc" {...form.register('description')} placeholder="Sobre o que é essa coleção?" rows={2} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Label>Ícone</Label>
          {(() => {
            const SelectedIcon = ICON_MAP[selectedIcon];
            return SelectedIcon ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <SelectedIcon className="h-3.5 w-3.5" />
                {selectedIcon}
              </span>
            ) : null;
          })()}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {ICONS.map((icon) => {
            const Icon = ICON_MAP[icon];
            return (
              <button
                key={icon}
                type="button"
                title={icon}
                onClick={() => form.setValue('icon', icon)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-md border p-2 text-[10px] transition-colors',
                  selectedIcon === icon
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-accent border-input text-muted-foreground hover:text-foreground'
                )}
              >
                {Icon && <Icon className="h-5 w-5" />}
                <span className="truncate w-full text-center leading-none">{icon}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Appearance */}
      <CollapsibleSection
        title={
          <span>
            Aparência
            {(coverColor || coverImage) && (
              <span className="ml-2 inline-flex h-3.5 w-3.5 rounded-full border border-input align-middle"
                style={{ background: coverColor || (coverImage ? `url(${coverImage}) center/cover` : '') }} />
            )}
          </span>
        }
        open={appearanceOpen}
        onToggle={() => setAppearanceOpen(v => !v)}
      >
        {/* Preview */}
        <div className="h-20 w-full rounded-md border overflow-hidden bg-muted">
          {coverImage ? (
            <img src={coverImage} alt="preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : coverColor ? (
            <div className="w-full h-full" style={{ backgroundColor: coverColor }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              Sem capa — escolha uma cor ou imagem abaixo
            </div>
          )}
        </div>

        {/* Color swatches */}
        <div className="space-y-1.5">
          <Label>Cor sólida</Label>
          <div className="flex flex-wrap gap-2 items-center">
            {COVER_COLORS.map(color => (
              <button
                key={color}
                type="button"
                title={color}
                onClick={() => {
                  form.setValue('cover_image', '');
                  form.setValue('cover_color', coverColor === color ? '' : color);
                }}
                className={cn(
                  'h-7 w-7 rounded-full transition-all',
                  coverColor === color
                    ? 'ring-2 ring-offset-2 ring-primary scale-110'
                    : 'hover:scale-110 ring-1 ring-black/10'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
            {coverColor && (
              <button type="button" title="Remover cor"
                onClick={() => form.setValue('cover_color', '')}
                className="h-7 w-7 rounded-full border border-input flex items-center justify-center hover:bg-accent transition-colors">
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Image URL */}
        <div className="space-y-1.5">
          <Label>Imagem de capa (URL)</Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://..."
              value={coverImage}
              onChange={e => {
                form.setValue('cover_image', e.target.value, { shouldValidate: true });
                if (e.target.value) form.setValue('cover_color', '');
              }}
              className="flex-1"
            />
            {coverImage && (
              <Button type="button" variant="ghost" size="icon"
                onClick={() => form.setValue('cover_image', '', { shouldValidate: true })}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          {form.formState.errors.cover_image && (
            <p className="text-xs text-destructive">{form.formState.errors.cover_image.message}</p>
          )}
          <p className="text-xs text-muted-foreground">A imagem tem prioridade sobre a cor sólida.</p>
        </div>
      </CollapsibleSection>

      {/* Attribute schema */}
      <CollapsibleSection
        title={<span>Atributos inteligentes {fields.length > 0 && <span className="text-muted-foreground">({fields.length})</span>}</span>}
        open={schemaOpen}
        onToggle={() => setSchemaOpen(v => !v)}
      >
        <p className="text-xs text-muted-foreground">
          Configure o tipo de cada atributo para filtros inteligentes e autocomplete nos itens.
        </p>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <Input placeholder="Nome do campo (ex: Diretor)" {...form.register(`attr_schema.${index}.key`)} className="flex-1" />
            <select {...form.register(`attr_schema.${index}.type`)}
              className="h-10 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              {ATTR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}
              className="text-destructive hover:text-destructive shrink-0">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => append({ key: '', type: 'text' })}>
          <Plus className="h-4 w-4 mr-1.5" />Adicionar campo
        </Button>
      </CollapsibleSection>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
      </div>
    </form>
  );
}
