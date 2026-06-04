import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Clock, Library, Package, PlusCircle, Pencil, Trash2, BookOpen } from 'lucide-react';
import { useData } from '../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { EmptyState } from '../components/EmptyState';
import { formatDate } from '../lib/utils';

const activityIcon: Record<string, typeof PlusCircle> = {
  added: PlusCircle,
  edited: Pencil,
  removed: Trash2,
};

const activityLabel: Record<string, string> = {
  added: 'Adicionado',
  edited: 'Editado',
  removed: 'Removido',
};

const activityColor: Record<string, string> = {
  added: 'bg-green-100 text-green-700',
  edited: 'bg-blue-100 text-blue-700',
  removed: 'bg-red-100 text-red-700',
};

export function Home() {
  const data = useData();
  const { user } = useAuth();

  const { data: activities = [], isLoading: loadingAct } = useQuery({
    queryKey: ['activities', user?.id],
    queryFn: () => data.listActivities(user!.id, 30),
    enabled: !!user,
  });

  const { data: collections = [] } = useQuery({
    queryKey: ['collections', user?.id],
    queryFn: () => data.listCollections(user!.id),
    enabled: !!user,
  });

  // Total stats
  const totalCollections = collections.length;

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {user?.display_name ?? 'bem-vindo'} 👋</h1>
        <p className="text-muted-foreground text-sm">Aqui está o seu histórico de atividades.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-primary/10 p-2">
              <Library className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCollections}</p>
              <p className="text-xs text-muted-foreground">Coleção{totalCollections !== 1 ? 'ões' : ''}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-primary/10 p-2">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activities.filter((a) => a.type === 'added').length}</p>
              <p className="text-xs text-muted-foreground">Itens adicionados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-full bg-primary/10 p-2">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activities.length}</p>
              <p className="text-xs text-muted-foreground">Atividades</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Histórico de atividades
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingAct ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : activities.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-8 w-8" />}
              title="Sem atividades ainda"
              description="Crie uma coleção e adicione itens para ver o histórico aqui."
              action={
                <Link
                  to="/collections"
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Ir para coleções
                </Link>
              }
            />
          ) : (
            <ul className="divide-y">
              {activities.map((act) => {
                const Icon = activityIcon[act.type] ?? PlusCircle;
                return (
                  <li key={act.id} className="flex items-start gap-3 px-6 py-3">
                    <div className={`mt-0.5 rounded-full p-1.5 ${activityColor[act.type]}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {activityLabel[act.type]}
                        </Badge>
                        <span className="text-sm font-medium truncate">{act.item_title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        em <span className="font-medium">{act.collection_name}</span>
                        {' · '}{formatDate(act.created_at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
