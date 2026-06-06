# Graph Report - my-collection-app  (2026-06-06)

## Corpus Check
- 70 files · ~25,500 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 427 nodes · 1049 edges · 19 communities (17 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `384b221e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
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
- [[_COMMUNITY_Community 20|Community 20]]

## God Nodes (most connected - your core abstractions)
1. `CollectionItem` - 43 edges
2. `LocalAdapter` - 34 edges
3. `cn()` - 34 edges
4. `SupabaseAdapter` - 29 edges
5. `useAuth()` - 25 edges
6. `AttributeSchema` - 22 edges
7. `Collection` - 21 edges
8. `useData()` - 19 edges
9. `Shelf` - 18 edges
10. `compilerOptions` - 17 edges

## Surprising Connections (you probably didn't know these)
- `AuthContextValue` --references--> `AuthUser`  [EXTRACTED]
  src/auth/AuthContext.tsx → src/types.ts
- `Props` --references--> `Collection`  [EXTRACTED]
  src/components/CollectionForm.tsx → src/types.ts
- `DropdownMenuShortcut()` --calls--> `cn()`  [EXTRACTED]
  src/components/ui/dropdown-menu.tsx → src/lib/utils.ts
- `AppRoutes()` --calls--> `useAuth()`  [EXTRACTED]
  src/App.tsx → src/auth/AuthContext.tsx
- `ItemDialog()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/ItemDialog.tsx → src/auth/AuthContext.tsx

## Import Cycles
- None detected.

## Communities (19 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (28): AuthChangeCallback, DataProvider, getPublicCollection(), listPublicItems(), normalizeLocalCollection(), supabase, fileToBase64(), generateId() (+20 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (36): AuthContext, AuthContextValue, AuthProvider(), useAuth(), ProtectedRoute(), ImportDialog(), Navbar(), DataContext (+28 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (47): AttributeInput(), DurationInput(), DurationInputProps, formatDuration(), Props, parseJson(), Props, Row (+39 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (17): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+9 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (36): dependencies, class-variance-authority, clsx, dexie, @hookform/resolvers, lucide-react, papaparse, @radix-ui/react-avatar (+28 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (43): EmptyState(), Props, ItemFilterPanel(), Props, CollectionExport, exportCollection(), autoRanges(), collectTags() (+35 more)

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
Cohesion: 0.17
Nodes (13): navLinks, Avatar, AvatarFallback, AvatarImage, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (27): ATTR_TYPES, CollectionForm(), COVER_COLORS, FormData, ICON_MAP, ICONS, Props, schema (+19 more)

### Community 20 - "Community 20"
Cohesion: 0.40
Nodes (4): name, organization_id, organization_slug, ref

## Knowledge Gaps
- **151 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+146 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CollectionItem` connect `Community 0` to `Community 2`, `Community 18`, `Community 6`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `cn()` connect `Community 2` to `Community 17`, `Community 18`, `Community 6`, `Community 1`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `LocalAdapter` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _151 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.055661729574773056 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09803921568627451 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07869742198100407 - nodes in this community are weakly interconnected._