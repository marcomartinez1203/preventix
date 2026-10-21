const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const backend = path.join(root, 'backend');
const vite = path.join(path.dirname(require.resolve('vite/package.json', { paths: [frontend] })), 'bin/vite.js');
const tsNode = require.resolve('ts-node/register/transpile-only', { paths: [backend] });
const children = [];
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}

function start(label, cwd, args) {
  const child = spawn(process.execPath, args, { cwd, stdio: 'inherit', windowsHide: true });
  children.push(child);
  child.on('error', error => { console.error(`${label}: ${error.message}`); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code || 1); });
}

console.log('Preventix: frontend http://localhost:5173 · backend http://127.0.0.1:3001');
console.log('Usuario: demo@preventix.com · Contraseña: Demo1234');
start('Backend', backend, ['-r', tsNode, 'src/server.ts']);
start('Frontend', frontend, [vite]);
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
