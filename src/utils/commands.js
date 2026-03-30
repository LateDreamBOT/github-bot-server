const cmds = {
	all: [
		'help',
		'close',
		'reopen',
		'merge',
		'merge-squash',
		'merge-rebase',
		'label',
		'rm-label',
		'assign',
		'rm-assign',
		// todo:
		// 'miles',
		// 'rm-miles',
	],
	issueOnly: [
		'close-not-plan',
		'close-dupl',
	],
	prOnly: [
		'merge',
		'merge-squash',
		'merge-rebase',
	]
}

export {
	cmds as default
}
