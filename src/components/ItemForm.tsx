import { useState, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Upload, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { AttributeInput } from './AttributeInput';
import { OmdbSearchPanel } from './OmdbSearchPanel';
import { useData } from '../data/DataContext';
import { normalize } from '../lib/utils';
import { imageUrlSchema, validateImageFile } from '../lib/constants';
import { toast } from 'sonner';
import type { CollectionItem, AttributeSchema } from '../types';

const schema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string(),
  photo_url: imageUrlSchema,
  attributes: z.array(z.object({ key: z.string(), value: z.string() })),
});

type FormData = z.infer<typeof schema>;

interface Props {
  initial?: Partial<CollectionItem>;
  onSubmit(data: Omit<CollectionItem, 'id' | 'collection_id' | 'created_at' | 'updated_at'>): Promise<unknown>;
  onCancel(): void;
  loading?: boolean;
  enableOmdb?: boolean;
  attributeSchema?: AttributeSchema;
  autocompleteValues?: Record<string, string[]>;
  /** normalized key → display key, used for quick-add suggestions */
  attributeKeyDisplays?: Record<string, string>;
}

export function ItemForm({ initial, onSubmit, onCancel, loading, enableOmdb, attributeSchema, autocompleteValues, attributeKeyDisplays }: Props) {
  const data = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(initial?.photo_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [omdbOpen, setOmdbOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      photo_url: initial?.photo_url ?? '',
      attributes: initial?.attributes
        ? Object.entries(initial.attributes).map(([key, value]) => ({ key, value }))
        : [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'attributes' });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      const url = await data.uploadImage(file);
      setPreview(url);
      form.setValue('photo_url', url);
    } finally {
      setUploading(false);
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPreview(e.target.value);
    form.setValue('photo_url', e.target.value, { shouldValidate: true });
  };

  const handleSubmit = async (values: FormData) => {
    const attributes: Record<string, string> = {};
    values.attributes.forEach(({ key, value }) => {
      if (key.trim()) attributes[key.trim()] = value;
    });
    await onSubmit({
      title: values.title,
      description: values.description,
      photo_url: values.photo_url,
      attributes,
      shelf_id: null,
      shelf_row: null,
      shelf_col: null,
    });
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {enableOmdb && (
        omdbOpen ? (
          <OmdbSearchPanel
            onClose={() => setOmdbOpen(false)}
            onSelect={(values) => {
              form.reset(values);
              setPreview(values.photo_url);
              setOmdbOpen(false);
            }}
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-dashed text-muted-foreground hover:text-foreground"
            onClick={() => setOmdbOpen(true)}
          >
            <Search className="h-3.5 w-3.5 mr-2" />
            Pré-preencher via OMDB
          </Button>
        )
      )}

      <div className="space-y-1.5">
        <Label htmlFor="title">Título *</Label>
        <Input id="title" {...form.register('title')} placeholder="Nome do item" />
        {form.formState.errors.title && (
          <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" {...form.register('description')} placeholder="Breve descrição..." rows={3} />
      </div>

      <div className="space-y-1.5">
        <Label>Foto</Label>
        {preview && (
          <img src={preview} alt="preview" className="w-full h-40 object-cover rounded-md border" referrerPolicy="no-referrer" />
        )}
        <div className="flex gap-2">
          <Input
            placeholder="URL da imagem"
            value={form.watch('photo_url')}
            onChange={handleUrlChange}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Upload de arquivo"
          >
            <Upload className="h-4 w-4" />
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {form.formState.errors.photo_url && (
          <p className="text-xs text-destructive">{form.formState.errors.photo_url.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Atributos extras</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => append({ key: '', value: '' })}
          >
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>

        {/* Quick-add suggestions: keys used in other items that aren't in this item yet */}
        {(() => {
          if (!attributeKeyDisplays || Object.keys(attributeKeyDisplays).length === 0) return null;
          const currentKeys = form.watch('attributes').map(a => normalize(a.key));
          const suggested = Object.entries(attributeKeyDisplays)
            .filter(([nk]) => nk && !currentKeys.includes(nk));
          if (suggested.length === 0) return null;
          return (
            <div className="rounded-md bg-muted/40 border border-dashed p-2.5 space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Adicionar rápido
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggested.map(([nk, displayKey]) => (
                  <button
                    key={nk}
                    type="button"
                    onClick={() => append({ key: displayKey, value: '' })}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/40 bg-background px-2.5 py-1 text-xs font-medium text-primary/80 hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    {displayKey}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
        {fields.map((field, index) => {
          const keyValue = form.watch(`attributes.${index}.key`);
          const nk = normalize(keyValue);
          // Case-insensitive schema and autocomplete lookup
          const config = attributeSchema
            ? (attributeSchema[keyValue] ?? Object.entries(attributeSchema).find(([k]) => normalize(k) === nk)?.[1])
            : undefined;
          const suggestions = autocompleteValues
            ? (autocompleteValues[nk] ?? autocompleteValues[keyValue] ?? [])
            : [];
          return (
            <div key={field.id} className="flex gap-2">
              <Input
                placeholder="Campo (ex: Autor)"
                {...form.register(`attributes.${index}.key`)}
                className="flex-1"
              />
              {(config || suggestions.length > 0) ? (
                <AttributeInput
                  type={config?.type ?? 'text'}
                  value={form.watch(`attributes.${index}.value`)}
                  onChange={v => form.setValue(`attributes.${index}.value`, v)}
                  // year fields: never pass suggestions (no autocomplete for numbers)
                  suggestions={config?.type === 'year' ? [] : suggestions}
                  placeholder="Valor"
                  className="flex-1"
                />
              ) : (
                <Input
                  placeholder="Valor"
                  {...form.register(`attributes.${index}.value`)}
                  className="flex-1"
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || uploading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
