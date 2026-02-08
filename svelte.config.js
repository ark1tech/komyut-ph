// Use Node adapter (no workerd) when USE_NODE_ADAPTER=true, e.g. pnpm run dev:node
// This avoids the Cloudflare workerd runtime requirement (macOS 13.5+ / Windows 11+)
const useNodeAdapter = process.env.USE_NODE_ADAPTER === 'true';

const adapter = useNodeAdapter
	? (await import('@sveltejs/adapter-node')).default()
	: (await import('@sveltejs/adapter-cloudflare')).default();

/** @type {import('@sveltejs/kit').Config} */
const config = { kit: { adapter } };

export default config;
