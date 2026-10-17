//! scripts/apply-patches.js

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const patchesDir = join(process.cwd(), 'patches');
const patches = readdirSync(patchesDir).filter((name) => name.endsWith('.patch')).sort();

function gitApply(args, patch) {
	return spawnSync('git', ['apply', ...args, '-'], {
		cwd: process.cwd(),
		encoding: 'utf8',
		input: patch,
	});
}

for (const name of patches) {
	const file = join(patchesDir, name);
	const patch = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
	const check = gitApply(['--check'], patch);
	if (check.error) throw check.error;
	if (check.status === 0) {
		const applied = gitApply([], patch);
		if (applied.error || applied.status !== 0) {
			throw new Error(`Could not apply ${name}: ${applied.error?.message || applied.stderr}`);
		}
		console.log(`Applied ${name}`);
		continue;
	}

	const alreadyApplied = gitApply(['--reverse', '--check'], patch);
	if (alreadyApplied.status === 0) {
		console.log(`Already applied ${name}`);
		continue;
	}
	throw new Error(`Could not apply ${name}: ${check.stderr}`);
}
