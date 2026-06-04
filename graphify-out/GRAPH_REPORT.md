# Graph Report - my-collection-app  (2026-06-04)

## Corpus Check
- 65 files · ~23,627 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 394 nodes · 950 edges · 21 communities (19 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6503f17d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]

## God Nodes (most connected - your core abstractions)
1. `CollectionItem` - 40 edges
2. `LocalAdapter` - 33 edges
3. `cn()` - 31 edges
4. `SupabaseAdapter` - 29 edges
5. `useAuth()` - 25 edges
6. `Collection` - 21 edges
7. `AttributeSchema` - 20 edges
8. `useData()` - 19 edges
9. `Shelf` - 17 edges
10. `compilerOptions` - 17 edges

## Surprising Connections (you probably didn't know these)
- `AuthContextValue` --references--> `AuthUser`  [EXTRACTED]
  src/auth/AuthContext.tsx → src/types.ts
- `AppRoutes()` --calls--> `useAuth()`  [EXTRACTED]
  src/App.tsx → src/auth/AuthContext.tsx
- `ItemDialog()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/ItemDialog.tsx → src/auth/AuthContext.tsx
- `Navbar()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/Navbar.tsx → src/auth/AuthContext.tsx
- `Props` --references--> `AttributeType`  [EXTRACTED]
  src/components/AttributeInput.tsx → src/types.ts

## Import Cycles
- None detected.

## Communities (21 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (28): Props, AuthChangeCallback, DataProvider, getPublicCollection(), listPublicItems(), normalizeLocalCollection(), supabase, fileToBase64() (+20 more)

### Community 1 - "Community 1"
Cohesion: 0.11
Nodes (33): AuthContext, AuthContextValue, AuthProvider(), useAuth(), ProtectedRoute(), ImportDialog(), DataContext, DataContextProvider() (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.12
Nodes (27): parseJson(), Props, Row, ItemDialog(), CollectionExport, exportCollection(), isCollectionExport(), formatDate() (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (25): AttributeInput(), DurationInput(), DurationInputProps, formatDuration(), Props, Props, FormData, ItemForm() (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (28): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+20 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (25): dependencies, class-variance-authority, clsx, dexie, @hookform/resolvers, lucide-react, papaparse, @radix-ui/react-avatar (+17 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (19): EmptyState(), Props, SearchDialog(), normalize(), ATTR_TYPE_ORDER, collectTags(), DURATION_PRESETS, IMDB_PRESETS (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 17 - "Community 17"
Cohesion: 0.15
Nodes (17): Navbar(), navLinks, cn(), Cell(), UnplacedTray(), Avatar, AvatarFallback, AvatarImage (+9 more)

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (9): ATTR_TYPES, CollectionForm(), COVER_COLORS, FormData, ICON_MAP, ICONS, schema, Textarea (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (9): Props, getOmdbMovie(), KEY, notNA(), OmdbFormValues, OmdbMovie, OmdbSearchResult, omdbToFormValues() (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.40
Nodes (4): name, organization_id, organization_slug, ref

## Knowledge Gaps
- **147 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+142 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CollectionItem` connect `Community 3` to `Community 0`, `Community 2`, `Community 6`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `LocalAdapter` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `SupabaseAdapter` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _147 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.051770451770451774 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11008325624421832 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11740890688259109 - nodes in this community are weakly interconnected._