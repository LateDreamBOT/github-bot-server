type Cmd = 'help' | 'close' | 'reopen' | 'label' | 'rm-label' | 'assign' | 'rm-assign';

type IssueCmd = Cmd | 'close-not-plan' | 'close-dupl';

type PrCmd = Cmd | 'merge' | 'merge-squash' | 'merge-rebase';
