import commander from 'commander';
import moment from 'moment';
import shell from 'shelljs';
import uuid from 'uuid/v4';
import ProgressBar from 'progress';

const exitWithMessage = message => {
	shell.echo(message);
	shell.exit(1);
};

const parseDate = val => {
	const mom = moment(val);
	if (!mom.isValid()) exitWithMessage(`${val} is an invalid date`);
	return mom;
};

const git = (command, ...args) => {
	if (shell.exec(`git ${command}`, ...args).code !== 0) {
		exitWithMessage(`Command "git ${command}" failed`);
	}
};

const random = (min, max) => Math.floor(Math.random() * (max - min)) + min;

const commit = (date, times) => {
	for (const i of Array.from(Array(times).keys())) {
		const name = uuid();
		shell.touch(`${name}`);
		git(`add ${name}`);
		git(`commit -m "Add ${name}" --date=${date.unix()}`, { silent: true });
	}
}

commander
	.option('-r --repository <path>', 'Git repository to commit into')
	.option('-s --start <d>', 'The start date you want to start commit at', parseDate, moment().subtract(1, 'years'))
	.option('-e --end <d>', 'The end date you want to stop commits at', parseDate, moment())
	.parse(process.argv);

if (commander.repository) {
	if (shell.cd(commander.repository).code !== 0) {
		exitWithMessage('Please provide a valid directory for you repository');
	}
}

if (!shell.which('git')) {
	exitWithMessage('This script requires git to work properly');
}

const status = shell.exec('git status -s', { silent: true }).stdout;

if (status && status.length) {
	exitWithMessage('Please have a clean git status before running this util');
}

const { start, end } = commander;
const days = end.diff(start, 'days');

const bar = new ProgressBar('committing [:bar] :percent :etas', {
	complete: '=',
	incomplete: ' ',
	width: 20,
	total: days
});

for (const i of Array.from(Array(days).keys())) {
	const mom = moment(start).add(i, 'days');
	commit(mom, random(1, 8));
	bar.tick();
}

// git('push');
