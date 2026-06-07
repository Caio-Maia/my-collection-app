# Graph Report - my-collection-app  (2026-06-06)

## Corpus Check
- 78 files · ~32,801 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 481 nodes · 1234 edges · 27 communities (22 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `884f7cad`
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
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]

## God Nodes (most connected - your core abstractions)
1. `CollectionItem` - 46 edges
2. `LocalAdapter` - 45 edges
3. `SupabaseAdapter` - 40 edges
4. `cn()` - 37 edges
5. `useAuth()` - 29 edges
6. `useData()` - 23 edges
7. `AttributeSchema` - 22 edges
8. `Collection` - 21 edges
9. `Button` - 19 edges
10. `normalize()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `AppRoutes()` --calls--> `useAuth()`  [EXTRACTED]
  src/App.tsx → src/auth/AuthContext.tsx
- `AuthContextValue` --references--> `AuthUser`  [EXTRACTED]
  src/auth/AuthContext.tsx → src/types.ts
- `Navbar()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/Navbar.tsx → src/auth/AuthContext.tsx
- `Props` --references--> `AttributeType`  [EXTRACTED]
  src/components/AttributeInput.tsx → src/types.ts
- `AttributeInput()` --calls--> `cn()`  [EXTRACTED]
  src/components/AttributeInput.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Communities (27 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.27
Nodes (6): DataContext, DataContextProvider(), AuthChangeCallback, DataProvider, fileToBase64(), Activity

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (61): AuthContext, AuthProvider(), useAuth(), ProtectedRoute(), EmptyState(), Props, ImportDialog(), Props (+53 more)

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (22): DurationInput(), DurationInputProps, formatDuration(), Props, Props, Props, Props, ATTR_TYPE_ORDER (+14 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (19): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+11 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (36): dependencies, class-variance-authority, clsx, dexie, @hookform/resolvers, lucide-react, papaparse, @radix-ui/react-avatar (+28 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (48): parseJson(), ItemFilterPanel(), Props, SearchDialog(), CollectionExport, exportCollection(), isCollectionExport(), autoRanges() (+40 more)

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
Nodes (4): generateId(), now(), getSessionUser(), LocalAdapter

### Community 18 - "Community 18"
Cohesion: 0.08
Nodes (27): AttributeInput(), ATTR_TYPES, COLLECTION_TYPES, CollectionForm(), COVER_COLORS, FormData, ICON_MAP, ICONS (+19 more)

### Community 19 - "Community 19"
Cohesion: 0.23
Nodes (9): getPublicCollection(), getPublicWishlist(), listPublicItems(), listPublicWishlistItems(), normalizeLocalCollection(), supabase, PublicWishlist(), SORT_OPTIONS (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.40
Nodes (4): name, organization_id, organization_slug, ref

### Community 22 - "Community 22"
Cohesion: 0.24
Nodes (6): AuthContextValue, hashPassword(), setSessionUser(), AuthUser, toAuthUser(), translateAuthError()

### Community 25 - "Community 25"
Cohesion: 0.12
Nodes (7): CollectionsDB, db, LocalUser, StoredImage, Props, Profile, Shelf

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (19): Navbar(), navLinks, BeforeInstallPromptEvent, useInstallPWA(), cn(), Cell(), UnplacedTray(), Avatar (+11 more)

## Knowledge Gaps
- **159 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+154 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `CollectionItem` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 6`, `Community 17`, `Community 18`, `Community 19`, `Community 25`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Why does `LocalAdapter` connect `Community 17` to `Community 0`, `Community 3`, `Community 22`, `Community 23`, `Community 24`, `Community 25`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `SupabaseAdapter` connect `Community 3` to `Community 0`, `Community 22`, `Community 23`, `Community 24`, `Community 25`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _159 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07023411371237458 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14393939393939395 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.12333333333333334 - nodes in this community are weakly interconnected._