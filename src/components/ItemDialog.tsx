import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ItemForm } from './ItemForm';
import { useData } from '../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { formatDate } from '../lib/utils';
import type { CollectionItem, AttributeSchema, AttributeType } from '../types';
import { formatDuration } from './AttributeInput';
import { toast } from 'sonner';

interface Props {
  item: CollectionItem | null;
  open: boolean;
  onOpenChange(open: boolean): void;
  attributeSchema?: AttributeSchema;
  autocompleteValues?: Record<string, string[]>;
  attributeKeyDisplays?: Record<string, string>;
  readonly?: boolean;
}

export function ItemDialog({ item, open, onOpenChange, attributeSchema, autocompleteValues, attributeKeyDisplays, readonly }: Props) {
  const data = useData();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [current, setCurrent] = useState<CollectionItem | null>(item);

  // Sync when a different item is selected
  useEffect(() => {
    setCurrent(item);
  }, [item]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['items', current?.collection_id] });
    qc.invalidateQueries({ queryKey: ['activities', user?.id] });
  };

  const updateMutation = useMutation({
    mutationFn: (vals: Omit<CollectionItem, 'id' | 'collection_id' | 'created_at' | 'updated_at'>) =>
      data.updateItem(current!.id, vals),
    onSuccess: (updated) => {
      setCurrent(updated);
      invalidate();
      setEditing(false);
      toast.success('Item atualizado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => data.deleteItem(current!.id),
    onSuccess: () => {
      invalidate();
      onOpenChange(false);
      toast.success('Item removido.');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!current) return null;

  const attrEntries = Object.entries(current.attributes ?? {}).filter(([k]) => k.trim());

  function displayValue(key: string, raw: string): string {
    const type = attributeSchema?.[key]?.type as AttributeType | undefined;
    if (type === 'duration') {
      const mins = parseInt(raw);
      return isNaN(mins) ? raw : formatDuration(mins);
    }
    return raw;
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setEditing(false); setConfirmDelete(false); } }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {editing ? (
          <>
            <DialogHeader>
              <DialogTitle>Editar item</DialogTitle>
            </DialogHeader>
            <ItemForm
              initial={current}
              onSubmit={(vals) => updateMutation.mutateAsync(vals)}
              onCancel={() => setEditing(false)}
              loading={updateMutation.isPending}
              attributeSchema={attributeSchema}
              autocompleteValues={autocompleteValues}
              attributeKeyDisplays={attributeKeyDisplays}
            />
          </>
        ) : confirmDelete ? (
          <>
            <DialogHeader>
              <DialogTitle>Remover item</DialogTitle>
              <DialogDescription>
                Tem certeza que quer remover <strong>{current.title}</strong>? Essa ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="pr-8">{current.title}</DialogTitle>
              <DialogDescription className="text-xs">
                Adicionado em {formatDate(current.created_at)}
                {current.updated_at !== current.created_at && ` · Editado em ${formatDate(current.updated_at)}`}
              </DialogDescription>
            </DialogHeader>

            {current.photo_url && (
              <img
                src={current.photo_url}
                alt={current.title}
                className="w-full h-56 object-cover rounded-md border"
              />
            )}

            {current.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{current.description}</p>
            )}

            {attrEntries.length > 0 && (
              <>
                <Separator />
                <dl className="grid grid-cols-2 gap-2">
                  {attrEntries.map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{key}</dt>
                      <dd className="text-sm mt-0.5">
                        <Badge variant="secondary">{displayValue(key, value)}</Badge>
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}

            {!readonly && (
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive border-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Remover
                </Button>
                <Button size="sm" onClick={() => setEditing(true)}>
                  <Edit className="h-4 w-4 mr-1.5" />
                  Editar
                </Button>
              </DialogFooter>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
