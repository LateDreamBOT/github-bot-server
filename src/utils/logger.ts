import log4js from 'log4js';
import config from '@config';

export default (channel: string) => {
	const newLogger = log4js.getLogger(channel);
	newLogger.level = config.server.logLevel;
	return newLogger;
}
