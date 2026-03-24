import { get } from './locale';
import cmds from './commands';

export type CommentType = 'pr-open' | 'issue-open' |
	'cmd-help' | 'cmd-comment' | 'cmd-unknown' | 'cmd-idk-args' | 'cmd-not-suitable-env';

const generateHelpMsg = (helpType?: 'issue' | 'pr') => {
	const map = cmds.all.map(cmd => {
		if(helpType === 'pr' && cmds.issueOnly.includes(cmd)) return;
		if(helpType === 'issue' && cmds.prOnly.includes(cmd)) return;
		return `> - \`${cmd}\`: ${get(`cmd-desc.${cmd}`)}`;
	});
	return map.join('\n');
}

export default (
	type: CommentType,
	author: string,
	cmd?: {action: string, args: string[] | null},
	helpType?: 'issue' | 'pr'
) => {
	switch(type) {
		case 'pr-open':
			return get('pr-open-msg', {author});
		case 'issue-open':
			return get('issue-open-msg', {author});
		case 'cmd-help':
			return get('cmd-help-msg', {
				author,
				cmds: generateHelpMsg(helpType)
			});
		case 'cmd-comment':
			return get('cmd-comment-msg', {
				author,
				action: get(`cmd.${cmd?.action}`) || ''
			});
		case 'cmd-unknown':
			return get('cmd-unknown-msg', {author});
		case 'cmd-idk-args':
			return get('cmd-idk-args-msg', {
				author,
				action: get(`cmd.${cmd?.action}`) || ''
			});
		default:
			return null;
	}
}
