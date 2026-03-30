import * as jsonc from 'jsonc-parser';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';

const cwd = process.cwd();
const defaultConfigPath = resolve(cwd, 'config.jsonc');

/** @argument {string} privateKey */
const parsePrivateKey = (privateKey) => {
	if(
		privateKey.startsWith('-----BEGIN RSA PRIVATE KEY-----') &&
		privateKey.endsWith('-----END RSA PRIVATE KEY-----')
	) return privateKey;
	else if(existsSync(resolve(cwd, privateKey)))
		return readFileSync(resolve(cwd, privateKey), 'utf-8');
	else throw new Error('private key not found!');
}

/** @argument {string} configPath */
const get = (configPath) => {
	if(!existsSync(configPath || defaultConfigPath))
		throw new Error('config.jsonc not found!');
	const config = jsonc.parse(readFileSync(
		configPath || defaultConfigPath,
		'utf-8'
	));
	config.app.privateKey = parsePrivateKey(config.app.privateKey);
	return config;
}

export {
	parsePrivateKey,
	get
}
