import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const allowedArgs = new Set(['--desktop', '--android', '--collect-only']);

for (const arg of args) {
  if (!allowedArgs.has(arg)) {
    console.error(`Unknown argument: ${arg}`);
    process.exit(1);
  }
}

const collectOnly = args.has('--collect-only');
if (args.has('--desktop') && args.has('--android')) {
  console.error('Use either --desktop or --android, not both.');
  process.exit(1);
}

const selected = args.has('--desktop') ? ['desktop']
  : args.has('--android') ? ['android']
    : ['desktop', 'android'];
const output = path.join(root, 'tauri-app-build-output');
const windowsOutput = path.join(output, 'windows');
const androidOutput = path.join(output, 'android');

await Promise.all([mkdir(windowsOutput, { recursive: true }), mkdir(androidOutput, { recursive: true })]);

if (!collectOnly) {
  for (const platform of selected) {
    const script = platform === 'desktop' ? 'tauri:build' : 'tauri:android:build';
    console.log(`Building ${platform}...`);
    const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], {
      cwd: path.join(root, 'web'),
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}

const tauri = path.join(root, 'web', 'src-tauri');
const copied = [];
async function copyIfExists(source, destination) {
  try {
    const info = await stat(source);
    if (!info.isFile()) return false;
    await copyFile(source, destination);
    copied.push({ file: path.relative(output, destination), bytes: info.size });
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

if (selected.includes('desktop')) {
  const release = path.join(tauri, 'target', 'release');
  await copyIfExists(path.join(release, 'prehistoric-tribes.exe'), path.join(windowsOutput, 'prehistoric-tribes.exe'));
  for (const [bundleType, extension] of [['nsis', '.exe'], ['msi', '.msi']]) {
    const bundleDir = path.join(release, 'bundle', bundleType);
    let files = [];
    try {
      files = await readdir(bundleDir, { withFileTypes: true });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    for (const file of files) {
      if (file.isFile() && path.extname(file.name).toLowerCase() === extension) {
        await copyIfExists(path.join(bundleDir, file.name), path.join(windowsOutput, file.name));
      }
    }
  }
}

if (selected.includes('android')) {
  await copyIfExists(
    path.join(tauri, 'gen', 'android', 'app', 'build', 'outputs', 'apk', 'universal', 'debug', 'app-universal-debug.apk'),
    path.join(androidOutput, 'prehistoric-tribes-universal-debug.apk'),
  );
}

if (copied.length === 0) {
  console.log('No matching build artifacts were found.');
} else {
  const rows = copied.map(({ file, bytes }) => ({ path: file, size: `${(bytes / (1024 * 1024)).toFixed(2)} MB` }));
  const widths = {
    path: Math.max('Path'.length, ...rows.map(({ path: file }) => file.length)),
    size: Math.max('Size'.length, ...rows.map(({ size }) => size.length)),
  };
  const line = `+-${'-'.repeat(widths.path)}-+-${'-'.repeat(widths.size)}-+`;
  console.log(line);
  console.log(`| ${'Path'.padEnd(widths.path)} | ${'Size'.padEnd(widths.size)} |`);
  console.log(line);
  for (const row of rows) console.log(`| ${row.path.padEnd(widths.path)} | ${row.size.padEnd(widths.size)} |`);
  console.log(line);
  console.log(`Copied ${copied.length} artifact(s) to ${path.relative(root, output)}.`);
}
