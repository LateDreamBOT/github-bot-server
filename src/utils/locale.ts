import { readFileSync } from 'fs';
import * as jsonc from 'jsonc-parser';

const locales = {} as Record<string, string>;

export const loadLocale = (path: string) => {
	const json = readFileSync(path, 'utf-8');
	Object.assign(locales, jsonc.parse(json));
}

export const get = (key: string, params?: Record<string, string>) => {
	const raw: string = (locales as Record<string, string>)[key];
	if(!raw) return 'missing-translation';
	const result = raw.replace(/{{(\w+)}}/g, (_, param: string) => (params?.[param]) || '');
	return result;
}
