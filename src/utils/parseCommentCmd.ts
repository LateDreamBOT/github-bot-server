import { type IssueCmd, type PrCmd } from './commands';

export default (body: string): {
	action: IssueCmd | PrCmd,
	args: string[] | null,
} | null => {
	if(!body.startsWith('/')) return null;
	const cmdParts = body.split(' ', 2);
	if(cmdParts.length === 2) cmdParts.shift();
	const args = cmdParts[1]? cmdParts[1].split(' '): null;
	return {
		action: cmdParts[0].slice(1) as IssueCmd | PrCmd,
		args
	}
}
