import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		// Node adapter + `node build` is reliable for Playwright; wrangler preview can EPIPE or time out.
		command: 'USE_NODE_ADAPTER=true pnpm run build && PORT=4173 HOST=127.0.0.1 node build',
		port: 4173,
		timeout: 180_000,
		reuseExistingServer: !process.env.CI
	},
	testDir: 'e2e'
});
