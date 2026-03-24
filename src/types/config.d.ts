type AppConfig = {
	/** github app id */
	id: string;
	/** github app private key */
	privateKey: string;
	/** language package */
	locale: string;
}

type ServerConfig = {
	/** server port */
	port: number;
	/** webhooks secret */
	secret: string;
	/** log level */
	logLevel: string;
}

/** todo */
type WebuiConfig = {
	/** webui port */
	port: number;
}

interface UserConfig {
	timeZone: string;
	app: AppConfig;
	server: ServerConfig;
	webui: WebuiConfig;
}
