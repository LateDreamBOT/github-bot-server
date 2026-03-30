import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import * as jsonc from 'jsonc-parser';

const cwd = process.cwd();
const supportedExt = ['.json', '.jsonc'];

/** @typedef {Record<string, string>} */
const locales = {};

/** @argument {string} file */
export const loadLocale = (file) => {
	const path = resolve(cwd, file);
	const result = supportedExt.some((ext, index) => {
		if(existsSync(path + ext)) {
			const json = readFileSync(path + ext, 'utf-8');
			Object.assign(locales, jsonc.parse(json));
			return true;
		} else if(index === supportedExt.length - 1)
			return false;
	});
	if(!result) throw new Error(`\`${file}\` is not exist`);
}

/**
 *
 * @param {string} key
 * @param {Record<string, string | undefined> | undefined} params
 * @returns {string}
 */
export const get = (key, params) => {
	const raw = locales[key];
	if(!raw) return 'missing-translation';
	const result = raw.replace(/{{(\w+)}}/g, (_, param) => (params?.[param]) || '');
	return result;
}
