import { get } from './locale.js';
import cmds from './commands.js';

/** @argument {'issue' | 'pr' | undefined} helpType */
const generateHelpMsg = (helpType) => {
	const map = cmds.all.map(cmd => {
		if(helpType === 'pr' && cmds.issueOnly.includes(cmd)) return;
		if(helpType === 'issue' && cmds.prOnly.includes(cmd)) return;
		return `> - \`${cmd}\`: ${get(`cmd-desc.${cmd}`)}`;
	});
	return map.join('\n');
}

/**
 * @argument {string} key
 * @argument {string} author
 * @argument {object} cmd
 * @argument {string} cmd.action
 * @argument {string[] | null} cmd.args
 * @argument {'issue' | 'pr' | undefined} helpType
 * @returns {string}
 */
export default (key, author, cmd, helpType) => {
	let cmds;
	if(helpType) cmds = generateHelpMsg(helpType);
	return get(key, {author, action: get(`cmd.${cmd?.action}`), cmds});
}
