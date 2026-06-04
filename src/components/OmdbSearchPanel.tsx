import { useState } from 'react';
import { Search, Film, X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { searchOmdb, getOmdbMovie, omdbToFormValues } from '../lib/omdb';
import type { OmdbSearchResult, OmdbFormValues } from '../lib/omdb';
import { cn } from '../lib/utils';

interface Props {
  onSelect(values: OmdbFormValues): void;
  onClose(): void;
}

export function OmdbSearchPanel({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OmdbSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setResults([]);
    try {
      const res = await searchOmdb(query.trim());
      setResults(res);
      setSearched(true);
    } catch {
      setError('Não foi possível conectar ao OMDB. Verifique sua conexão.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = async (item: OmdbSearchResult) => {
    setSelecting(item.imdbID);
    try {
      const movie = await getOmdbMovie(item.imdbID);
      if (movie) onSelect(omdbToFormValues(movie));
    } catch {
      setError('Erro ao carregar detalhes do filme.');
    } finally {
      setSelecting(null);
    }
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
          <Search className="h-3.5 w-3.5" />
          Buscar no OMDB
        </p>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
          placeholder="Busque o filme em inglês..."
          className="flex-1 h-8 text-sm"
          autoFocus
        />
        <Button type="button" size="sm" disabled={searching || !query.trim()} className="h-8 px-3" onClick={handleSearch}>
          {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {results.length > 0 && (
        <ul className="space-y-1 max-h-52 overflow-y-auto">
          {results.map(item => (
            <li key={item.imdbID}>
              <button
                type="button"
                disabled={selecting === item.imdbID}
                onClick={() => handleSelect(item)}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent',
                  selecting === item.imdbID && 'opacity-60 pointer-events-none',
                )}
              >
                {item.Poster && item.Poster !== 'N/A' ? (
                  <img src={item.Poster} alt={item.Title} className="h-10 w-7 object-cover rounded flex-shrink-0" />
                ) : (
                  <div className="h-10 w-7 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <Film className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">{item.Title}</p>
                  <p className="text-xs text-muted-foreground">{item.Year}</p>
                </div>
                {selecting === item.imdbID && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin ml-auto flex-shrink-0 text-primary" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {searched && results.length === 0 && !searching && !error && (
        <p className="text-xs text-muted-foreground text-center py-2">Nenhum resultado encontrado.</p>
      )}
    </div>
  );
}
