# @our-story/mobile

Expo SDK 54 + Expo Router 6 client for OurStory. Talks to `apps/web`'s `/api/v1/*` over Bearer-token auth (RS256 access + opaque refresh, rotated on every refresh, refresh stored in OS keychain via `expo-secure-store`).

This is a working note — point of view a developer who just opened `apps/mobile/` and wants to make a change.

## Layout

```
apps/mobile/
  app.json                 Expo config (name, scheme, plugins, typedRoutes on)
  metro.config.js          Watches the workspace root so @our-story/* resolves
  app/                     Expo Router file-based routes
    _layout.tsx            Root: fonts, providers (Query, Auth), splash gate
    index.tsx              Auth-aware redirect → (auth)/sign-in or (tabs)/browse
    (auth)/                Sign-in / sign-up group, no headers
    (tabs)/                Bottom tabs — browse, bookmarks, me
    s/[slug].tsx           Reader (modal-style stack screen with toolbar)
  src/
    components/            StoryCard, FeaturedCard
    context/auth.tsx       AuthProvider + useAuth — boot, sign-in/up, sign-out
    lib/
      api.ts               apiFetch + apiFetchAnonymous, single-flight refresh
      env.ts               API_BASE_URL with platform-aware fallback
      queries.ts           Fetchers + queryKeys factory; mutations live here too
      query-client.ts      TanStack Query singleton
      secure-storage.ts    Refresh token at rest (keychain/keystore)
    theme/tokens.ts        Colors, spacing, radius, typography
```

## Layered architecture

```
  Screens (app/**.tsx)
   └── useQuery / useMutation hooks ← TanStack Query
        └── fetchers (src/lib/queries.ts)
             └── apiFetch (src/lib/api.ts)
                  ├── attaches Authorization: Bearer (from auth context)
                  ├── on 401 → single-flight refresh → retries
                  └── parses errors via @our-story/api-types ApiErrorSchema
```

Every server response is parsed through a Zod schema from `@our-story/api-types` before reaching a screen. Drift between server and client surfaces as a `ZodError`, not a silent UI break.

## Auth, in plain sentences

- **Boot**: load refresh token from secure storage. If present, `POST /auth/mobile/refresh` exchanges it for a new pair (the response includes the user). If absent or refresh fails, drop to `(auth)/sign-in`. Splash holds until this resolves so we never flash unstyled or unauthenticated UI.
- **Sign in**: `POST /auth/mobile/login` → store refresh, hold access in memory.
- **Sign up**: `POST /auth/mobile/signup` (mobile-only — bypasses the cookie session that the web `/auth/signup` would create).
- **Every request**: `apiFetch` injects the access token. On 401, it triggers a single-flight refresh (`refreshPromise` lock), then retries once. If refresh itself fails, `onAuthFailure` clears state and the redirect kicks in.
- **Sign out**: best-effort `POST /auth/mobile/logout` to revoke the refresh server-side, then clear local state.

Access token lives in a `useRef` (not state) so `apiFetch` can read it synchronously without re-renders.

## Adding a screen

1. Drop a file at `app/path/screen.tsx` or `app/path/[param].tsx`. Expo Router picks it up automatically.
2. Use `SafeAreaView` from `react-native-safe-area-context` for top/bottom edges.
3. Pull tokens from `@/src/theme/tokens` — don't hardcode colors or font sizes.
4. If the screen fetches data, add a query key + fetcher in `src/lib/queries.ts`, then `useQuery(...)` in the screen.

## Adding a query / mutation

In `src/lib/queries.ts`:

```ts
export const queryKeys = {
  // ...existing
  myThing: (id: string) => ["my-thing", id] as const,
};

export async function fetchMyThing(id: string): Promise<MyThingWire> {
  const body = await apiFetch<unknown>(`/api/v1/my-thing/${encodeURIComponent(id)}`);
  return MyThingResponseSchema.parse(body);
}
```

If the schema doesn't exist yet, add it to `packages/api-types/src/index.ts` first so server and client stay in sync.

For mutations, follow the like/bookmark pattern in `app/s/[slug].tsx`:
- `onMutate`: snapshot + write the optimistic state.
- `onError`: roll back to the snapshot.
- `onSettled`: snap to the server's authoritative response (or `invalidateQueries` for list views that need to re-fetch).

## Theming

`src/theme/tokens.ts` exports `colors`, `spacing` (8pt grid), `radius`, `fonts`, and `typography`. Compose styles via spread:

```ts
title: { ...typography.title, color: colors.ink },
```

Fonts (`Fraunces` + `Inter`) load via `useFonts` in `app/_layout.tsx`. Until they resolve, the splash holds — so you can use `fonts.serifMedium` etc. in any screen without checking ready state.

## Run

```bash
# from the repo root
pnpm install                 # once
pnpm mobile start            # opens Expo dev tools
# i / a / w → iOS sim / Android emu / web

# or directly
pnpm --filter @our-story/mobile start
```

For physical devices (LAN), set `EXPO_PUBLIC_API_BASE_URL=http://<your-ip>:3000` before `pnpm mobile start`.

## What's intentionally not here

- Composer (writing). Web-only by product decision.
- OAuth (Google / GitHub). Mobile sign-in is email + password; OAuth would require a WebView dance that's deferred for v1.
- Comments / follows / notifications. Not in the v1 brief.
- Image upload / cover art. Image features are deferred at the platform level.
- Tests. No mobile unit/integration tests yet — `apps/web/__tests__` covers the API contracts that mobile depends on, which is the highest-value safety net for now.
