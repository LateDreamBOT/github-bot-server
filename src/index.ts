import { App } from 'octokit';
import { Webhooks } from '@octokit/webhooks';
import Koa from 'koa';
import koaBody from 'koa-body';
import config from '@config';
import Logger from './utils/logger';
import generateUserAgent from './utils/generateUserAgent';
import comment from './utils/comment';
import parseCommentCmd from './utils/parseCommentCmd';
import cmds from './utils/commands';
import { readFileSync } from 'fs';

import packageJson from '@package';

const logger = Logger('server');

const privateKey = readFileSync(config.app.privateKey, 'utf-8');

const githubApp = new App({
	appId: config.app.id,
	privateKey,
	userAgent: generateUserAgent()
});

const webhooks = new Webhooks({
	secret: config.server.secret
});

webhooks.on('pull_request', async (ev) => {
	const installationId = ev.payload?.installation?.id;
	if(!installationId) return logger.warn('installation id is empty');
	const octokit = await githubApp.getInstallationOctokit(installationId);

	switch(ev.payload.action) {
		case 'opened':
			await octokit.rest.issues.createComment({
				owner: ev.payload.repository.full_name.split('/')[0],
				repo: ev.payload.repository.name,
				issue_number: ev.payload.pull_request.number,
				body: comment('pr-open', ev.payload.sender.login)!
			});
			break;
	}
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
				body: comment('issue-open', ev.payload.sender.login)!
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

	const cmd = parseCommentCmd(ev.payload.comment.body);
	if(!cmd) return;
	let body: string;
	if(!cmds.all.includes(cmd.action)) body = comment('cmd-unknown', author)!;

	else {
		switch(cmd.action) {
			case 'help':
				const isIssue = !!ev.payload.issue;
				body = comment('cmd-help', author, undefined, isIssue? 'issue': 'pr')!;
				break;
			default:
				body = comment('cmd-comment', author, cmd)!;
				break;
		}

		const shared = {
			owner: ev.payload.repository.owner.login,
			repo: ev.payload.repository.name,
			issue_number: ev.payload.issue.number,
		}

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
						body: comment('cmd-not-suitable-env', author, cmd)!
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
						body: comment('cmd-not-suitable-env', author, cmd)!
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
						body: comment('cmd-idk-args', author, cmd)!
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
						body: comment('cmd-idk-args', author, cmd)!
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
						body: comment('cmd-idk-args', author, cmd)!
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
						body: comment('cmd-idk-args', author, cmd)!
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
				if(isIssue)
					await octokit.rest.issues.updateComment({
						...shared,
						comment_id: cmt.data.id,
						body: comment('cmd-not-suitable-env', author, cmd)!
					});
				else {
					const merge_method: any = cmd.action.split('-').length === 2?
						cmd.action.split('-')[1]: 'merge';
					await octokit.rest.pulls.merge({
						...shared,
						pull_number: ev.payload.issue.number,
						merge_method
					});
				}
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

				logger.debug(`new request: ${JSON.stringify(ctx.request.body, null, 2)}`);
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
	console.log(`\x1b[1m\x1b[5m\x1b[34m${packageJson.name}\x1b[0m \x1b[36mv${packageJson.version}\x1b[0m\n`);
	logger.info(`bot server is running at: http://localhost:${config.server.port}`);
	logger.info(`webhook endpoint available at: http://localhost:${config.server.port}/webhook`);
});
