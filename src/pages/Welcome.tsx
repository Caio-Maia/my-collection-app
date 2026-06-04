import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Library, SlidersHorizontal, Film, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import hero from '../assets/hero.png';

const features = [
  {
    icon: Library,
    title: 'Coleções do seu jeito',
    desc: 'Crie coleções de qualquer coisa — filmes, livros, vinis — com ícones, capas e atributos personalizados.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Filtros inteligentes',
    desc: 'Filtre por nota, ano, duração, gênero ou qualquer atributo. As faixas se ajustam aos seus dados.',
  },
  {
    icon: Film,
    title: 'Busca de filmes integrada',
    desc: 'Pré-preencha um item buscando o filme pelo nome — título, sinopse, pôster e elenco vêm prontos.',
  },
];

export function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Atmospheric background: soft gradient blobs + subtle grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -right-24 h-[34rem] w-[34rem] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-1/3 -left-32 h-[28rem] w-[28rem] rounded-full bg-violet-500/15 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
      </div>

      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <BookOpen className="h-6 w-6 text-primary" />
          <span>MyCollections</span>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/login">Entrar</Link>
        </Button>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-5">
        <section className="grid items-center gap-10 py-12 md:grid-cols-2 md:py-20">
          <div className="max-w-xl">
            <span className="animate-fade-up inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Sua coleção, organizada de verdade
            </span>

            <h1
              className="animate-fade-up mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl"
              style={{ animationDelay: '80ms' }}
            >
              Organize tudo que você{' '}
              <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
                coleciona
              </span>
            </h1>

            <p
              className="animate-fade-up mt-5 text-lg text-muted-foreground"
              style={{ animationDelay: '160ms' }}
            >
              Catalogue filmes, livros, jogos e o que mais quiser. Atributos sob medida,
              filtros inteligentes e busca automática de filmes — tudo num só lugar.
            </p>

            <div
              className="animate-fade-up mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: '240ms' }}
            >
              <Button size="lg" className="gap-2" onClick={() => navigate('/signup')}>
                Criar conta grátis
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
                Já tenho conta
              </Button>
            </div>
          </div>

          {/* Hero image */}
          <div
            className="animate-fade-up relative flex justify-center md:justify-end"
            style={{ animationDelay: '200ms' }}
          >
            <div className="absolute inset-0 -z-10 m-auto h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <img
              src={hero}
              alt="Coleções empilhadas"
              className="animate-float-slow w-64 select-none drop-shadow-2xl sm:w-80"
              draggable={false}
            />
          </div>
        </section>

        {/* Features */}
        <section className="grid gap-4 pb-20 sm:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="animate-fade-up group rounded-xl border bg-card/60 p-5 backdrop-blur-sm transition-colors hover:border-primary/30"
              style={{ animationDelay: `${320 + i * 90}ms` }}
            >
              <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2.5 text-primary transition-transform group-hover:scale-110">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
