import { init } from './utils/core.js';
import Koa from 'koa';
import koaBody from 'koa-body';
import Logger from './utils/logger.js';
import { loadLocale } from './utils/locale.js';
import { get } from './utils/config.js';

// import pkg from '@package';
import pkg from '../package.json' with { type: 'json' };

const config = get();

const logger = Logger('server', config.server.logLevel);

const { webhooks } = init(config, logger);

const app = new Koa();
app.use(koaBody());

app.use(async(ctx, next) => {
	switch(ctx.path) {
		case '/webhook':
			if(ctx.method === 'POST') {
				const signature = ctx.get('x-hub-signature-256');
				const id = ctx.get('x-github-delivery');
				const name = ctx.get('x-github-event');

				logger.debug('new webhook request received:', JSON.stringify({id, name}));
				const body = JSON.stringify(ctx.request.body);
				if(!body) {
					ctx.status = 400;
					ctx.body = 'body is required!';
					logger.info('receive an empty request');
					return;
				}

				ctx.set('server', `${pkg.name}-v${pkg.version}`);

				await webhooks.verifyAndReceive({
					id,
					name,
					signature,
					payload: body
				});

				ctx.status = 204;
				return;
			} else {
				ctx.status = 405;
				ctx.body = 'method not allowed!';
				return;
			}
		default:
			await next();
	}
});

app.use(async(ctx, next) => {
	ctx.status = 403;
	ctx.body = 'forbidden!';
	return;
});

app.on('error', (err) => {
	logger.error(err.message, err?.stack);
});

app.listen(config.server.port, () => {
	console.log(`
█───████─███─███─████──████─███─████─█───█────████──████─███
█───█──█──█──█───█──██─█──█─█───█──█─██─██────█──██─█──█──█─
█───████──█──███─█──██─████─███─████─█─█─█────████──█──█──█─
█───█──█──█──█───█──██─█─█──█───█──█─█───█────█──██─█──█──█─
███─█──█──█──███─████──█─█──███─█──█─█───█────████──████──█─ \x1b[36mv${pkg.version}\x1b[0m
`);
	console.log('\tPowered by Koa\n');

	logger.info(`bot server is running at: http://localhost:${config.server.port}`);
	logger.info(`webhook endpoint available at: http://localhost:${config.server.port}/webhook\n`);
});

loadLocale('locales/' + config.app.locale);
