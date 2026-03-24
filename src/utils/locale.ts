// import config from '@config';
import locales from '../locales/zh-CN.json';

export const get = (key: string, params?: Record<string, string>) => {
	const raw: string = (locales as Record<string, string>)[key];
	if(!raw) return 'missing-translation';
	const result = raw.replace(/{{(\w+)}}/g, (_, param: string) => (params?.[param]) || '');
	return result;
}
