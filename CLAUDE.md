# Enterprise Portal Starter Template Rules

Lean rules for this enterprise template project.

## Stack

- React 19, TypeScript, Vite, Tailwind CSS v4, shadcn UI, React Query v5.
- API calls go through `src/services/apiClient.ts`; no hardcoded base URLs elsewhere.
- Shared API/domain types live in `src/types/*`; services and hooks do not export them.

## Frontend Architecture

- Put reusable backend shapes in `src/types`; use `import type`.
- Keep one-off prop types beside their component.
- Prefer shadcn components from `src/components/ui`.
- Services are API wrappers only, grouped by domain: `apiClient.ts`, `queryKeys.ts`, `errorReporting.ts`.
- Hooks handle React Query orchestration; keep components thin.
- Use theme tokens and shadcn variants for dark mode.
- Use `<ProtectedRoute>` with `navigationCode` or `permissionCode` to enforce RBAC.

## Backend Alignment

- Keep explicit request/response schemas aligned with frontend `src/types`.
- Uploads accept multipart form data and return stable IDs/metadata.

## Checks

- Run `npm run build` after TypeScript or component changes.
- Run `npm run lint` after broad/shared changes.

### Server-Sent Events (SSE) & Real-Time Event Streaming
* **"Wait for Event" Model Only (Mandatory):**
  * **NEVER** use polling loops (`check -> sleep -> check`) or database polling heartbeats inside SSE streaming endpoints.
  * **NEVER** query the database repeatedly inside SSE stream generators.
  * **Always** use `await event_queue.get()` (or `asyncio.wait_for(q.get(), timeout=30.0)` for lightweight ping) to suspend the coroutine at the event loop level with zero CPU/DB overhead until a published event arrives.

---

## 4. Architecture Notice: Web SPA vs Universal App (Expo + Vite)

> **CRITICAL PRE-SETUP DECISION**: This choice must be made **BEFORE** using the template to write application features.
> - **Option 1 (Default)**: Pure Web SPA (React 19 + Vite + Tailwind CSS v4) matching Admin & Finance portals.
> - **Option 2**: Universal Web + Mobile App (Expo 57 + React Native Web + Vite) matching CEO Dashboard.
>
> If the project requires mobile support (iOS/Android), convert the frontend immediately upon initial project setup before writing UI components to avoid refactoring later.

### Prompt Instructions to Convert Frontend into Universal Web + App:
When the user asks to convert this frontend (`Template_Automation_Front`) into a Universal Web + Mobile App like CEO Dashboard, execute the following:
1. **Dependencies**: In `package.json`, add Expo (v57+), React Native (0.86+), React Native Web (0.21+), `@react-navigation/native`, `@react-navigation/native-stack`, `expo-linking`, `expo-web-browser`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, and `concurrently`.
2. **Dual-Runner Scripts**: Configure concurrent Expo Metro bundler on port `:8090` and Vite web server on port `:5178`:
   ```json
   "start": "concurrently -n \"EXPO,WEB\" -c \"cyan,magenta\" \"expo start --host lan --port 8090\" \"vite\"",
   "dev": "vite",
   "ios": "expo start --ios --host lan --port 8090",
   "android": "node scripts/start-android.js"
   ```
3. **Vite Bundler Aliases**: Update `vite.config.ts` with `react-native-web` aliases and `codegenShim`.
4. **Navigation Container**: Wrap native mobile entrypoints with React Navigation `<NavigationContainer>` while maintaining the web React Router hierarchy.

---

## 5. Mobile & Responsive UI Guidelines (Mandatory)

When coding any UI component, page, modal, or layout for this project:

1. **Mobile-First & Responsive by Default**:
   - Every view MUST be fully responsive and tested against mobile viewports (`phone`: 375px, `large`: 480px, `tablet`: 768px, `laptop`: 992px).
   - Use responsive flex and grid wrappers (`flex-col sm:flex-row`, `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`).
   - Never write desktop-only fixed widths or overflow-inducing layouts.

2. **Mobile Navigation & Sandwich (Drawer) Menu**:
   - The sandwich menu overlay (`Sidebar.tsx`) MUST automatically close when any navigation link, sub-item, or logo is tapped on mobile/tablet (`< 992px`).
   - Listen to `location.pathname` so that any route change or programmatic navigation automatically dismisses the mobile drawer.
   - Always render the backdrop overlay on mobile to dismiss the drawer when tapping outside.

3. **Touch-Friendly Controls & Mobile Forms**:
   - Interactive elements (buttons, inputs, selects, tabs) must have adequate touch targets (minimum 36px–44px height).
   - Modal dialogs must fit small screens: `max-w-md w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto`.
   - Form action buttons inside modals or footers must stack or wrap gracefully on narrow screens (`flex-col-reverse sm:flex-row`).
   - Always use `truncate` or `break-words` on long text, badges, or email addresses to avoid blowing out container widths on 375px phone screens.

4. **Data Tables & Card Alternatives on Mobile**:
   - When presenting tabular data, provide a stacked card view for mobile (`block md:hidden`) or an explicitly scrollable container (`overflow-x-auto scrollbar-thin`).
   - Metric cards and KPI grids must wrap cleanly into 1 or 2 columns on mobile devices (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).

5. **Device & Emulator Verification**:
   - Verify all layouts in Chrome DevTools Device Mode / Emulator view (e.g. iPhone 14 / Pixel 7 at 375px–412px width).
   - Ensure horizontal scrolling does NOT occur on the body/main container (`overflow-x-hidden`).
