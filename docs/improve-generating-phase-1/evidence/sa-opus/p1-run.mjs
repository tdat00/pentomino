// @ts-check
// SA-Opus, improve-generating phase 1, round-1 analysis: runs one command under a chosen Node binary and writes its
// whole output (stdout and stderr) to a log file, then exits with the command's status. p1-verify.ps1 starts it
// inside the lock helper (Invoke-IgNode inherits the console, so the helper alone keeps no log). `self` is the Node
// that runs this file (the default v26); any other name is an environment variable holding a node.exe path (IG_NODE22:
// the Node 22 that `npx -y node@22` put in the npm cache, the version of .github/workflows/pages.yml).
//   node docs\improve-generating-phase-1\evidence\sa-opus\p1-run.mjs <log> <self|ENV_NAME> -- <node arguments...>
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';

const [log, which, sep, ...args] = process.argv.slice(2);
if (log === undefined || which === undefined || sep !== '--' || args.length === 0) {
  process.stderr.write('usage: p1-run.mjs <log> <self|ENV_NAME> -- <node arguments...>\n');
  process.exit(2);
}
const exe = which === 'self' ? process.execPath : process.env[which];
if (exe === undefined || exe === '') {
  process.stderr.write(`p1-run: ${which} is not set\n`);
  process.exit(2);
}
const version = String(spawnSync(exe, ['--version'], { encoding: 'utf8' }).stdout).trim();
const out = createWriteStream(log);
out.write(`p1-run: ${exe} ${version}; node ${args.join(' ')}\n`);
const child = spawn(exe, args, { stdio: ['ignore', 'pipe', 'pipe'] });
child.stdout.on('data', (d) => out.write(d));
child.stderr.on('data', (d) => out.write(d));
child.on('close', (code) => {
  out.write(`p1-run: exit ${code}\n`);
  out.end(() => {
    process.stdout.write(`p1-run: ${version} exit ${code} (${log})\n`);
    process.exit(code ?? 1);
  });
});
