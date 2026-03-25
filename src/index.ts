import { App } from 'octokit';
import { Webhooks } from '@octokit/webhooks';
import Koa from 'koa';
import koaBody from 'koa-body';
import Logger from './utils/logger';
import generateUserAgent from './utils/generateUserAgent';
import comment from './utils/comment';
import parseCommentCmd from './utils/parseCommentCmd';
import cmds from './utils/commands';
import { loadLocale } from './utils/locale';
import * as jsonc from 'jsonc-parser';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';

import packageJson from '@package';

const cwd = process.cwd();

const config: UserConfig = jsonc.parse(readFileSync(resolve(cwd, 'config.jsonc'), 'utf-8'));

const logger = Logger('server', config.server.logLevel);

const privateKey = config.app.privateKey.startsWith('-----')? config.app.privateKey:
	readFileSync(resolve(cwd, config.app.privateKey), 'utf-8');

const githubApp = new App({
	appId: config.app.id,
	privateKey,
	userAgent: generateUserAgent()
});

const webhooks = new Webhooks({
	secret: config.server.secret
});

webhooks.on('pull_request.opened', async (ev) => {
	const installationId = ev.payload.installation?.id;
	if(!installationId) return logger.warn('installation id is empty');
	const octokit = await githubApp.getInstallationOctokit(installationId);

	await octokit.rest.issues.createComment({
		owner: ev.payload.repository.full_name.split('/')[0],
		repo: ev.payload.repository.name,
		issue_number: ev.payload.pull_request.number,
		body: comment('pr-open', ev.payload.sender.login)
	});
});

webhooks.on('issues', async (ev) => {
	const installationId = ev.payload.installation?.id;
	if(!installationId) return logger.warn('installation id is empty');
	const octokit = await githubApp.getInstallationOctokit(installationId);

	switch(ev.payload.action) {
		case 'opened':
			await octokit.rest.issues.createComment({
				owner: ev.payload.repository.owner.login,
				repo: ev.payload.repository.name,
				issue_number: ev.payload.issue.number,
				body: comment('issue-open', ev.payload.sender.login)
			});
			break;
	}
});

webhooks.on('issue_comment.created', async (ev) => {
	const installationId = ev.payload.installation?.id;
	if(!installationId) return logger.warn('installation id is empty');
	const octokit = await githubApp.getInstallationOctokit(installationId);

	const author = ev.payload.sender.login;
	const isIssue = !!ev.payload.issue;

	const cmd = parseCommentCmd(ev.payload.comment.body, config.app.cmd.prefix);
	if(!cmd) return;
	logger.debug('new cmd received:', JSON.stringify(cmd, null, 2));

	const shared = {
		owner: ev.payload.repository.owner.login,
		repo: ev.payload.repository.name,
		issue_number: ev.payload.issue.number,
	}

	if(ev.payload.comment.author_association !== 'MEMBER') {
		const level = config.app.cmd.permissionLevel?.toLowerCase() || 'any';

		switch(level) {
			case 'any':
				logger.warn('permission level is `any` or not set, this may case security risk');
				break;
			case 'bot':
				if(ev.payload.sender.type === 'bot') break;
			case 'contributor':
				if(ev.payload.comment.author_association.includes('CONTRIBUTOR')) break;
			case 'collaborator':
				if(ev.payload.comment.author_association === 'COLLABORATOR') break;
			case 'owner':
				if(ev.payload.comment.author_association === 'OWNER') break;
			default:
				logger.warn(`user ${author} has try to execute ${cmd.action} but not in level ${level.toUpperCase()}`);
				await octokit.rest.issues.createComment({
					...shared,
					body: comment('cmd-permission-denied-msg', author, cmd)
				});
				return false;
		}
	}
	if(!cmds.all.includes(cmd.action) && !config.app.cmd.prefix) {
		await octokit.rest.issues.createComment({
			...shared,
			body: comment('cmd-unknown-msg', author, cmd)
		});
		return;
	} else {
		const body = cmd.action === 'help'?
			comment('cmd-help-msg', author, undefined, isIssue? 'issue': 'pr'):
			comment('cmd-comment-msg', author, cmd);

		const cmt = await octokit.rest.issues.createComment({
			...shared,
			body
		});
		logger.info(`create comment at repo ${ev.payload.repository.full_name}`);

		switch(cmd.action) {
			case 'close':
				await octokit.rest.issues.update({
					...shared,
					state: 'closed',
					state_reason: 'completed'
				});
				break;
			case 'close-dupl':
				if(!isIssue)
					await octokit.rest.issues.updateComment({
						...shared,
						comment_id: cmt.data.id,
						body: comment('cmd-not-suitable-env', author, cmd)
					});
				else await octokit.rest.issues.update({
					...shared,
					state: 'closed',
					state_reason: 'duplicate'
				});
				break;
			case 'close-not-plan':
				if(!isIssue)
					await octokit.rest.issues.updateComment({
						...shared,
						comment_id: cmt.data.id,
						body: comment('cmd-not-suitable-env', author, cmd)
					});
				else await octokit.rest.issues.update({
					...shared,
					state: 'closed',
					state_reason: 'not_planned'
				});
				break;
			case 'reopen':
				await octokit.rest.issues.update({
					...shared,
					state: 'open',
					state_reason: 'reopened'
				});
				break;
			case 'label':
				if(!cmd.args)
					await octokit.rest.issues.updateComment({
						...shared,
						comment_id: cmt.data.id,
						body: comment('cmd-idk-args-msg', author, cmd)
					});
				else await octokit.rest.issues.addLabels({
					...shared,
					labels: cmd.args
				});
				break;
			case 'rm-label':
				if(!cmd.args)
					await octokit.rest.issues.updateComment({
						...shared,
						comment_id: cmt.data.id,
						body: comment('cmd-idk-args-msg', author, cmd)
					});
				else await octokit.rest.issues.setLabels({
					...shared,
					labels: ev.payload.issue.labels.filter(label => !cmd.args!.includes(label.name)),
				});
				break;
			case 'assign':
				if(!cmd.args)
					await octokit.rest.issues.updateComment({
						...shared,
						comment_id: cmt.data.id,
						body: comment('cmd-idk-args-msg', author, cmd)
					});
				else await octokit.rest.issues.addAssignees({
					owner: ev.payload.repository.owner.login,
					repo: ev.payload.repository.name,
					issue_number: ev.payload.issue.number,
					assignees: cmd.args
				});
				break;
			case 'rm-assign':
				if(!cmd.args)
					await octokit.rest.issues.updateComment({
						...shared,
						comment_id: cmt.data.id,
						body: comment('cmd-idk-args-msg', author, cmd)
					});
				else await octokit.rest.issues.removeAssignees({
					owner: ev.payload.repository.owner.login,
					repo: ev.payload.repository.name,
					issue_number: ev.payload.issue.number,
					assignees: cmd.args
				});
				break;
			case 'merge':
			case 'merge-squash':
			case 'merge-rebase':
				// if(isIssue)
				// 	await octokit.rest.issues.updateComment({
				// 		...shared,
				// 		comment_id: cmt.data.id,
				// 		body: comment('cmd-not-suitable-env', author, cmd)
				// 	});
				// else {
					const merge_method: any = cmd.action.split('-').length === 2?
						cmd.action.split('-')[1]: 'merge';
					await octokit.rest.pulls.merge({
						...shared,
						pull_number: ev.payload.issue.number,
						merge_method
					});
				// }
				break;
		}
	}
});

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

				await webhooks.verifyAndReceive({
					id,
					name,
					signature,
					payload: body
				});

				ctx.status = 200;
				ctx.body = 'ok';
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
███─█──█──█──███─████──█─█──███─█──█─█───█────████──████──█─ \x1b[36mv${packageJson.version}\x1b[0m
`);
	console.log('\tPowered by Koa\n');

	const localeFile = resolve(cwd, 'locales', config.app.locale);
	const supportedExt = ['.json', '.jsonc'];

	supportedExt.some((ext, index) => {
		if(existsSync(localeFile + ext)) {
			logger.info(`will use locale file: ${config.app.locale}${ext}`);
			loadLocale(localeFile + ext);
			return true;
		} else if(index === supportedExt.length - 1) {
			logger.fatal(`no locale file found: ${config.app.locale}`);
			process.exit(1);
		}
	});

	logger.info(`bot server is running at: http://localhost:${config.server.port}`);
	logger.info(`webhook endpoint available at: http://localhost:${config.server.port}/webhook\n`);
});
