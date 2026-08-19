#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const HEADER =
  'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h';
const NEEDLE = /(\n\s*)SWIFT_RETURNS_RETAINED (RuntimeScheduler\()/g;

let source;
try {
  source = readFileSync(HEADER, 'utf8');
} catch {
  process.exit(0);
}

const patched = source.replace(NEEDLE, '$1$2');
if (patched === source) {
  process.exit(0);
}

writeFileSync(HEADER, patched);
console.log('[patch] expo-modules-jsi: removed SWIFT_RETURNS_RETAINED from RuntimeScheduler ctors');
