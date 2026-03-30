import cmds from './commands.js';

/**
 * @argument {string} body - the comment body
 * @argument {string} prefix - the command prefix, default is '/'
 * @returns {{action: IssueCmd | PrCmd, args: string[]} | null} - the command action and args
 */
export default (body, prefix) => {
	if(prefix && !body.startsWith(prefix)) return null;
	const cmdParts = body.split(' ', 2);
	if(cmdParts.length === 2) cmdParts.shift();
	if(!prefix && !cmds.all.includes(cmdParts[0])) return null;
	const args = cmdParts[1]? cmdParts[1].split(' '): null;
	return {
		action: prefix? cmdParts[0].slice(1): cmdParts[0],
		args
	}
}
