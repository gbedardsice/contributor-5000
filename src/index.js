import commander from 'commander';
import moment from 'moment';
import shell from 'shelljs';
import uuid from 'uuid/v4';
import ProgressBar from 'progress';
import fetch from 'node-fetch';

import fs from 'fs';
import path from 'path';

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
	const { code, stdout } = shell.exec(`git ${command}`, ...args);
	if (code !== 0) {
		exitWithMessage(`Command "git ${command}" failed with message ${stdout}`);
	}
};

const random = (min, max) => Math.floor(Math.random() * (max - min)) + min;

const range = n => Array.from(Array(n).keys());

const commit = (date, times, path) => (
	range(times).reduce(promise => (
		promise
			.then(() => fetch('http://whatthecommit.com/index.txt'))
			.then(res => res.text())
			.then(message => {
				fs.appendFileSync(path, `${uuid()}\n`);
				git('add data.txt');
				git(`commit -m "${message}" --date=${date.unix()}`, { silent: true });
			})
	), Promise.resolve())
);

commander
	.option('-r, --repository <path>', 'Git repository to commit into')
	.option('-s, --start <d>', 'The start date you want to start commit at', parseDate, moment().subtract(1, 'years'))
	.option('-e, --end <d>', 'The end date you want to stop commits at', parseDate, moment())
	.option('-np, --no-push', 'Do not immediately push the newly added commits')
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
	width: 80,
	total: days
});

const file = path.join(commander.repository, 'data.txt');
if (!fs.existsSync(file)) {
	fs.writeFileSync(file, '');
}

range(days)
	.reduce((promise, i) => (
		promise
			.then(() => {
				const mom = moment(start).add(i, 'days');
				return commit(mom, random(1, 8), file);
			})
			.then(() => bar.tick())
	), Promise.resolve())
	.then(() => {
		if (!commander.noPush) {
			git('push');
			shell.echo('Success, your contribution graph is now populated!');
		} else {
			shell.echo('Added a bunch of commits to your repository!');
		}
	});
