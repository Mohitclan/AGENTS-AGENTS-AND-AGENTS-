#!/usr/bin/env node
// Runs the tests in scripts/tests/ against throwaway copies of this repo.
//
//   node scripts/test.mjs
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './_shared.mjs';

const dir = join(ROOT, 'scripts', 'tests');
const files = readdirSync(dir).filter((f) => f.endsWith('.test.mjs')).map((f) => join(dir, f));
const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(r.status ?? 1);
