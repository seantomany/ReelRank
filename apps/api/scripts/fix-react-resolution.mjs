/**
 * In this hoisted monorepo, the mobile app's React 18 gets hoisted to root
 * node_modules, causing react-dom, next, styled-jsx, and ably to each bundle
 * their own nested React 19 copies. Multiple React instances break hooks.
 *
 * This script unifies all React 19 copies to a single instance by symlinking
 * them to the API app's react.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monoRoot = path.resolve(__dirname, '..', '..', '..');
const canonicalReact = path.resolve(__dirname, '..', 'node_modules', 'react');

if (!fs.existsSync(canonicalReact)) {
  console.log('No local react found, skipping fix');
  process.exit(0);
}

const canonicalVersion = JSON.parse(
  fs.readFileSync(path.join(canonicalReact, 'package.json'), 'utf8'),
).version;

console.log(`Canonical React: ${canonicalReact} (${canonicalVersion})`);

const dirsToCheck = [
  path.join(monoRoot, 'node_modules', 'react-dom', 'node_modules', 'react'),
  path.join(monoRoot, 'node_modules', 'next', 'node_modules', 'react'),
  path.join(monoRoot, 'node_modules', 'styled-jsx', 'node_modules', 'react'),
  path.join(monoRoot, 'node_modules', 'ably', 'node_modules', 'react'),
];

for (const dir of dirsToCheck) {
  if (!fs.existsSync(dir)) continue;

  const realDir = fs.realpathSync(dir);
  const realCanonical = fs.realpathSync(canonicalReact);

  if (realDir === realCanonical) continue;

  try {
    const version = JSON.parse(
      fs.readFileSync(path.join(dir, 'package.json'), 'utf8'),
    ).version;

    if (version !== canonicalVersion) continue;

    console.log(`  Fixing: ${path.relative(monoRoot, dir)} (${version})`);
    fs.rmSync(dir, { recursive: true });
    fs.symlinkSync(canonicalReact, dir, 'dir');
    console.log(`    -> Symlinked to canonical`);
  } catch {
    // Skip if we can't read or fix
  }
}
