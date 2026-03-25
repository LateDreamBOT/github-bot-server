import cmds, { type IssueCmd, type PrCmd } from './commands';

export default (body: string, prefix?: string): {
	action: IssueCmd | PrCmd,
	args: string[] | null,
} | null => {
	if(prefix && !body.startsWith(prefix)) return null;
	const cmdParts = body.split(' ', 2);
	if(cmdParts.length === 2) cmdParts.shift();
	if(!prefix && !cmds.all.includes(cmdParts[0])) return null;
	const args = cmdParts[1]? cmdParts[1].split(' '): null;
	return {
		action: cmdParts[0].slice(1) as IssueCmd | PrCmd,
		args
	}
}
