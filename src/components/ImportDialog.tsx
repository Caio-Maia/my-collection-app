import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import { Upload, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { useData } from '../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import type { CollectionItem } from '../types';
import { isCollectionExport } from '../lib/export';
import { toast } from 'sonner';

interface Props {
  collectionId: string;
  open: boolean;
  onOpenChange(open: boolean): void;
}

type Row = Record<string, string>;

function parseJson(text: string): { rows: Row[]; isExport: boolean } {
  const parsed = JSON.parse(text);
  if (isCollectionExport(parsed)) {
    return { rows: parsed.items as unknown as Row[], isExport: true };
  }
  if (Array.isArray(parsed)) return { rows: parsed as Row[], isExport: false };
  throw new Error('JSON deve ser um array de objetos ou um arquivo de exportação de coleção.');
}

function mapRows(rows: Row[]): Array<Omit<CollectionItem, 'id' | 'collection_id' | 'created_at' | 'updated_at'>> {
  return rows.map((row) => {
    const { title, description, photo_url, ...rest } = row;
    const attributes: Record<string, string> = {};
    Object.entries(rest).forEach(([k, v]) => {
      if (k && v !== undefined) attributes[k] = String(v);
    });
    return {
      title: title ?? '(sem título)',
      description: description ?? '',
      photo_url: photo_url ?? '',
      attributes,
      shelf_id: null,
      shelf_row: null,
      shelf_col: null,
    };
  });
}

export function ImportDialog({ collectionId, open, onOpenChange }: Props) {
  const data = useData();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [isExportFormat, setIsExportFormat] = useState(false);

  const reset = () => {
    setPreview([]);
    setError('');
    setFileName('');
    setIsExportFormat(false);
  };

  const handleFile = (file: File) => {
    setError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (file.name.endsWith('.json')) {
          const { rows, isExport } = parseJson(text);
          setPreview(rows);
          setIsExportFormat(isExport);
        } else {
          const result = Papa.parse<Row>(text, { header: true, skipEmptyLines: true });
          if (result.errors.length > 0) throw new Error(result.errors[0].message);
          setPreview(result.data);
          setIsExportFormat(false);
        }
      } catch (err) {
        setError((err as Error).message);
        setPreview([]);
      }
    };
    reader.readAsText(file);
  };

  const importMutation = useMutation({
    mutationFn: () =>
      data.bulkCreateItems(collectionId, user!.id, mapRows(preview)),
    onSuccess: (items) => {
      qc.invalidateQueries({ queryKey: ['items', collectionId] });
      qc.invalidateQueries({ queryKey: ['activities', user?.id] });
      onOpenChange(false);
      reset();
      toast.success(`${items.length} item(s) importado(s) com sucesso!`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns = preview.length > 0 ? Object.keys(preview[0]) : [];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar itens</DialogTitle>
          <DialogDescription>
            Selecione um arquivo <strong>.csv</strong> ou <strong>.json</strong>. Colunas reconhecidas: <code>title</code>, <code>description</code>, <code>photo_url</code>. As demais viram atributos extras.
          </DialogDescription>
        </DialogHeader>

        <div>
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {fileName ? fileName : 'Clique ou arraste um arquivo .csv ou .json'}
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        {isExportFormat && (
          <div className="flex items-start gap-2 rounded-md bg-blue-500/10 border border-blue-500/20 p-3 text-blue-700 dark:text-blue-300 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            Arquivo de exportação de coleção detectado — apenas os itens serão importados para esta coleção.
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {preview.length > 0 && (
          <div>
            <Label className="mb-2 block">
              Pré-visualização ({preview.length} linha{preview.length !== 1 ? 's' : ''})
            </Label>
            <div className="overflow-x-auto rounded-md border">
              <table className="text-xs w-full">
                <thead className="bg-muted">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="px-3 py-2 text-left font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t">
                      {columns.map((col) => (
                        <td key={col} className="px-3 py-2 max-w-[120px] truncate">
                          {row[col] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {preview.length > 5 && (
                    <tr className="border-t">
                      <td colSpan={columns.length} className="px-3 py-2 text-muted-foreground text-center">
                        + {preview.length - 5} linha(s) oculta(s)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onOpenChange(false); reset(); }}>
            Cancelar
          </Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={preview.length === 0 || importMutation.isPending}
          >
            {importMutation.isPending ? 'Importando...' : `Importar ${preview.length} item(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
