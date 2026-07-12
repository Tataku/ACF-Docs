import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FRAMEWORK_CHART_SPECS } from '../components/framework-charts/chart-specs.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SITE = path.join(ROOT, 'public', 'site-b');
const OUTPUT = path.join(SITE, 'navigation-registry.json');
const CHECK = process.argv.includes('--check');
const ORIGIN = 'https://docs.acfdashboard.com';

const PAGES = [
  { part: 0, route: '/', file: 'cover-docs.html',