import { type UserConfig } from 'tsdown';

export default {
	entry: { 'bot-server': './src/index.ts' },
	deps: { skipNodeModulesBundle: true },
	target: 'node14',
	format: 'cjs',
	minify: true,
	tsconfig: 'tsconfig.node.json'
} satisfies UserConfig;
