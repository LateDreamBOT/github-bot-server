import log4js from 'log4js';

/**
 * @argument {string} channel - the logger channel name
 * @argument {string} logLevel - the logger log level
 * @returns {Logger} - the logger instance
 */
export default (channel, logLevel) => {
	const newLogger = log4js.getLogger(channel);
	newLogger.level = logLevel;
	return newLogger;
}
