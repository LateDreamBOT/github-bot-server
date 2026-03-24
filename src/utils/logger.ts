import log4js from 'log4js';

export default (channel: string, logLevel: string) => {
	const newLogger = log4js.getLogger(channel);
	newLogger.level = logLevel;
	return newLogger;
}
