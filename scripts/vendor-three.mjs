#!/usr/bin/env node
// Copies the few Three.js files the 3D office uses into scripts/control/vendor/three/, so the page
// needs no npm install and the repo carries 2 MB instead of the whole 22 MB package. The add-ons
// import the bare name 'three', which a browser can't resolve without an import map (an inline
// script the page's security policy refuses), so those imports are pointed at the copied build.
//
//   npm install --no-save three@<version> && node scripts/vendor-three.mjs
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ROOT } from './_shared.mjs';

export const FILES = [
  'build/three.module.js',
  'build/three.core.js',
  'examples/jsm/loaders/GLTFLoader.js',
  'examples/jsm/controls/OrbitControls.js',
  'examples/jsm/utils/SkeletonUtils.js',
  'examples/jsm/utils/BufferGeometryUtils.js',
  'examples/jsm/environments/RoomEnvironment.js',
];

const from = join(ROOT, 'node_modules', 'three');
const to = join(ROOT, 'scripts', 'control', 'vendor', 'three');
const version = JSON.parse(readFileSync(join(from, 'package.json'), 'utf8')).version;
for (const file of FILES) {
  mkdirSync(dirname(join(to, file)), { recursive: true });
  const text = readFileSync(join(from, file), 'utf8');
  writeFileSync(join(to, file), file.startsWith('examples/') ? text.replace(/from 'three';/g, "from '/vendor/three/build/three.module.js';") : text);
}
copyFileSync(join(from, 'LICENSE'), join(to, 'LICENSE'));
writeFileSync(join(to, 'VERSION'), `${version}\n`);
console.log(`Copied Three.js ${version}: ${FILES.length} files into scripts/control/vendor/three/`);
