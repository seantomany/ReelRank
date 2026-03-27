#!/usr/bin/env node

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

const iosDir = path.join(projectRoot, 'ios');
if (fs.existsSync(iosDir)) {
  console.log('Removing existing ios/ directory...');
  fs.rmSync(iosDir, { recursive: true, force: true });
}

console.log('Running expo prebuild programmatically...');
console.log('Project root:', projectRoot);

async function run() {
  const { prebuildAsync } = require('@expo/prebuild-config');
  const { getConfig } = require('@expo/config');
  const { compileModsAsync } = require('expo/config-plugins');

  const config = getConfig(projectRoot, {
    skipSDKVersionRequirement: false,
  });

  console.log('App:', config.exp.name, 'v' + config.exp.version);
  console.log('Bundle ID:', config.exp.ios?.bundleIdentifier);

  console.log('\nGenerating native iOS project...');
  
  const result = spawnSync(
    process.execPath,
    [
      '-e',
      `
      process.env.EXPO_NO_TELEMETRY = '1';
      process.env.CI = '1';
      const { createForPlatformAsync } = require('@expo/prebuild-config/build/getPrebuildConfig');
      // Use internal expo prebuild
      `,
    ],
    { cwd: projectRoot, stdio: 'inherit' }
  );

  console.log('Using expo eject/prebuild internal API...');

  execSync(
    'node -e "' +
      "process.argv=['node','expo','prebuild','--platform','ios','--clean','--no-install'];" +
      "process.env.EXPO_NO_TELEMETRY='1';" +
      "process.env.CI='1';" +
      "const mod=require('@expo/cli/build/src/prebuild/index.js');" +
      "mod.expoPrebuild(['--platform','ios','--clean','--no-install']);" +
    '"',
    {
      cwd: projectRoot,
      stdio: 'inherit',
      timeout: 300000,
      env: { ...process.env, EXPO_NO_TELEMETRY: '1', CI: '1' },
    }
  );
}

run().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
