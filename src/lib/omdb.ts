const BASE = 'https://www.omdbapi.com';
const KEY = import.meta.env.VITE_OMDB_API_KEY as string;

export interface OmdbSearchResult {
  imdbID: string;
  Title: string;
  Year: string;
  Poster: string;
  Type: string;
}

export interface OmdbMovie {
  imdbID: string;
  Title: string;
  Year: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Actors: string;
  Plot: string;
  Poster: string;
  imdbRating: string;
  Response: string;
}

export interface OmdbFormValues {
  title: string;
  description: string;
  photo_url: string;
  attributes: Array<{ key: string; value: string }>;
}

export async function searchOmdb(query: string): Promise<OmdbSearchResult[]> {
  const url = `${BASE}/?s=${encodeURIComponent(query)}&type=movie&apikey=${KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.Response === 'False') return [];
  return (data.Search as OmdbSearchResult[]) ?? [];
}

export async function getOmdbMovie(imdbId: string): Promise<OmdbMovie | null> {
  const url = `${BASE}/?i=${encodeURIComponent(imdbId)}&plot=short&apikey=${KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.Response === 'False') return null;
  return data as OmdbMovie;
}

function notNA(v: string | undefined): v is string {
  return !!v && v !== 'N/A';
}

export function omdbToFormValues(movie: OmdbMovie): OmdbFormValues {
  const attributes: Array<{ key: string; value: string }> = [];
  if (notNA(movie.Year)) attributes.push({ key: 'Ano', value: movie.Year });
  if (notNA(movie.Director)) attributes.push({ key: 'Diretor', value: movie.Director });
  if (notNA(movie.Genre)) attributes.push({ key: 'Gênero', value: movie.Genre });
  if (notNA(movie.Actors)) attributes.push({ key: 'Atores', value: movie.Actors });
  if (notNA(movie.Runtime)) {
    const mins = movie.Runtime.replace(/\D/g, '');
    if (mins) attributes.push({ key: 'Duração', value: mins });
  }
  if (notNA(movie.imdbRating)) attributes.push({ key: 'IMDb', value: movie.imdbRating });

  return {
    title: movie.Title,
    description: notNA(movie.Plot) ? movie.Plot : '',
    photo_url: notNA(movie.Poster) ? movie.Poster : '',
    attributes,
  };
}
