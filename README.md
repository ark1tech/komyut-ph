# komyut-ph

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli). This project uses **pnpm** as the package manager.

## Getting started (for the team)

If you're joining the project or setting up a new machine:

1. **Prerequisites**
   - [Node.js](https://nodejs.org/) 20.19+, 22.13+, or 24+ (LTS recommended)
   - [pnpm](https://pnpm.io/installation) (e.g. `npm install -g pnpm`)
   - **macOS:** 13.5+ for local Cloudflare runtime (workerd). On 13.2–13.4 use `dev:node` / `preview:remote` (see below).
   - **Windows:** 11 or later for local Cloudflare runtime. On Windows 10 use `dev:node` / `preview:remote`.

2. **Clone and install**
   ```sh
   git clone https://github.com/ark1tech/komyut-ph.git
   cd komyut-ph
   pnpm install
   ```

3. **Start developing**
   ```sh
   pnpm run dev
   ```
   Or start the dev server and open the app in a browser:
   ```sh
   pnpm run dev -- --open
   ```
   **Older OS (macOS < 13.5 or Windows 10):** If `pnpm run dev` fails (e.g. "Unsupported macOS version" or workerd not supported), use the Node-based dev server instead:
   ```sh
   pnpm run dev:node
   ```
   Production builds still target Cloudflare; only local dev uses Node when you run `dev:node`.

4. **Useful commands**
   | Command | Description |
   |---|---|
   | `pnpm run dev` | Start dev server (needs macOS 13.5+ or Windows 11+) |
   | `pnpm run dev:node` | Start dev server without Cloudflare runtime (for older OS) |
   | `pnpm run build` | Production build |
   | `pnpm run preview` | Preview production build locally (needs macOS 13.5+ or Windows 11+) |
   | `pnpm run preview:remote` | Preview on Cloudflare's edge (for older OS; needs network + Cloudflare account) |
   | `pnpm run lint` | Run ESLint and Prettier check |
   | `pnpm run format` | Format code with Prettier |
   | `pnpm run check` | Run Svelte/TypeScript checks |
   | `pnpm run test` | Run unit and e2e tests |
   | `pnpm run test:unit` | Run unit tests only |
   | `pnpm run test:e2e` | Run Playwright e2e tests |

## Developing

After installing dependencies with `pnpm install`, start the development server:

```sh
pnpm run dev

# or start the server and open the app in a new browser tab
pnpm run dev -- --open
```

## Building

To create a production version of your app:

```sh
pnpm run build
```

Preview the production build with `pnpm run preview`.

**Older OS (macOS < 13.5 or Windows 10):** The Cloudflare Workers runtime (workerd) needs macOS 13.5+ or Windows 11+. If `pnpm run dev` or `pnpm run preview` fails:

- **For dev:** use `pnpm run dev:node` (Node adapter locally; build still targets Cloudflare).
- **For preview:** use `pnpm run preview:remote` (runs on Cloudflare's edge; needs network and account).

Alternatively, upgrade your OS or use a [DevContainer](https://github.com/cloudflare/workerd?tab=readme-ov-file#running-workerd) with Linux (glibc 2.35+).

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Tooling Overview

### Code Quality & Formatting

- **Prettier** 
  Automatically formats your code for consistent styling—think of it as auto-correct for your code. Highly recommended; it saves time and helps avoid formatting disputes within teams.

- **ESLint**  
  Catches bugs and code quality issues early, much like a spell-checker or code-proof-reader. Highly recommended for maintaining code health in any serious project.

### Testing

- **Vitest**  
  A framework for writing unit tests. Use it to automatically verify your code works as intended. Recommended for growing apps to avoid accidental breakages.

- **Playwright**  
  End-to-end (E2E) test runner that simulates real user interactions, such as clicking buttons or filling out forms in a browser. Recommended for testing critical user flows (login, checkout, etc.).

### Deployment

- **SvelteKit Adapter**  
  Connects SvelteKit to your deployment platform (e.g., Cloudflare, custom Node server). Required for deploying the app to production.

### Database & Backend

- **Supabase  (To be installed)**  
  An open-source backend-as-a-service platform providing a Postgres database, authentication, storage, and real-time APIs. This is for managing the app’s data, handling user authentication (login, signup, etc.), and storing files—all without maintaining your own backend infrastructure.
  

### Development Tools

- **Devtools JSON**  
  Browser extension for app debugging. Optional, but useful during development.

- **MCP (Model Context Protocol)**  
  Exposes development tools to AI assistants. Very optional, experimental feature.