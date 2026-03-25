import { get } from './locale';
import cmds from './commands';

const generateHelpMsg = (helpType?: 'issue' | 'pr') => {
	const map = cmds.all.map(cmd => {
		if(helpType === 'pr' && cmds.issueOnly.includes(cmd)) return;
		if(helpType === 'issue' && cmds.prOnly.includes(cmd)) return;
		return `> - \`${cmd}\`: ${get(`cmd-desc.${cmd}`)}`;
	});
	return map.join('\n');
}

export default (
	key: string,
	author: string,
	cmd?: {action: string, args: string[] | null},
	helpType?: 'issue' | 'pr'
) => {
	let cmds;
	if(helpType) cmds = generateHelpMsg(helpType);
	return get(key, {author, action: get(`cmd.${cmd?.action}`), cmds});
}
