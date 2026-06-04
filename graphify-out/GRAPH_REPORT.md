# Graph Report - my-collection-app  (2026-06-03)

## Corpus Check
- 50 files · ~16,904 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 316 nodes · 700 edges · 17 communities (15 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `LocalAdapter` - 26 edges
2. `SupabaseAdapter` - 24 edges
3. `useAuth()` - 23 edges
4. `cn()` - 22 edges
5. `CollectionItem` - 22 edges
6. `useData()` - 17 edges
7. `Collection` - 17 edges
8. `compilerOptions` - 17 edges
9. `compilerOptions` - 16 edges
10. `AuthUser` - 13 edges

## Surprising Connections (you probably didn't know these)
- `AppRoutes()` --calls--> `useAuth()`  [EXTRACTED]
  src/App.tsx → src/auth/AuthContext.tsx
- `AuthContextValue` --references--> `AuthUser`  [EXTRACTED]
  src/auth/AuthContext.tsx → src/types.ts
- `ItemDialog()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/ItemDialog.tsx → src/auth/AuthContext.tsx
- `Navbar()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/Navbar.tsx → src/auth/AuthContext.tsx
- `AttributeInput()` --calls--> `cn()`  [EXTRACTED]
  src/components/AttributeInput.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (17 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (24): AuthContextValue, Props, AuthChangeCallback, DataProvider, supabase, fileToBase64(), generateId(), now() (+16 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (31): AuthContext, AuthProvider(), useAuth(), ProtectedRoute(), ImportDialog(), DataContext, DataContextProvider(), useData() (+23 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (31): Props, Row, Navbar(), navLinks, cn(), ICON_MAP, Avatar, AvatarFallback (+23 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (20): AttributeInput(), DurationInput(), DurationInputProps, formatDuration(), Props, ATTR_TYPES, CollectionForm(), COVER_COLORS (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (16): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (34): dependencies, class-variance-authority, clsx, dexie, @hookform/resolvers, lucide-react, papaparse, @radix-ui/react-avatar (+26 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (15): EmptyState(), Props, ItemDialog(), formatDate(), normalize(), ATTR_TYPE_ORDER, DURATION_PRESETS, itemMatchesRanges() (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

## Knowledge Gaps
- **128 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+123 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CollectionItem` connect `Community 0` to `Community 2`, `Community 3`, `Community 6`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `LocalAdapter` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Why does `SupabaseAdapter` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _128 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06923361717882266 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.11616161616161616 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10253699788583509 - nodes in this community are weakly interconnected._