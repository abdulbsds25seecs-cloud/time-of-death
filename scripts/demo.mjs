import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDemo } from '../lib/demo.mjs';
const data = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.data');
console.log(JSON.stringify(await createDemo(data), null, 2));
