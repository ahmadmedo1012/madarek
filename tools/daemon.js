// Minimal double-fork daemonizer: spawns a command fully detached so it
// survives the sandbox tool-shell lifecycle (reparented to PID 1 like pg_ctl).
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const [, , name, cmd, ...args] = process.argv;
if (!name || !cmd) {
  console.error('usage: node daemon.js <name> <cmd> [args...]');
  process.exit(1);
}

const logPath = `/home/z/madarek/${name}.log`;
const out = fs.openSync(logPath, 'a');
const err = fs.openSync(logPath, 'a');

const child = spawn(cmd, args, {
  cwd: process.env.DAEMON_CWD || '/home/z/madarek',
  detached: true,
  stdio: ['ignore', out, err],
  env: process.env,
});
child.unref();
fs.writeFileSync(`/home/z/madarek/${name}.pid`, String(child.pid));
console.log(`daemon ${name} pid=${child.pid} log=${logPath}`);
