// Reconstructed downstream compatibility check, not an upstream clsx test.
// Uses the historical manifest with Node's real package resolver. No install,
// build, upstream lifecycle script or third-party executable is needed.
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
const probe=path.resolve('.tod-manifest-probe');
await mkdir(path.join(probe,'node_modules','clsx'),{recursive:true});
await writeFile(path.join(probe,'node_modules','clsx','package.json'),await readFile('package.json','utf8'));
try{
  const require=createRequire(path.join(probe,'probe.cjs'));
  const resolved=require.resolve('clsx/package.json');
  if(!resolved.endsWith('package.json'))throw new Error('Unexpected resolution');
  console.log('PASS: clsx/package.json resolves for downstream tooling');
}catch(error){console.error(`PACKAGE_MANIFEST_ACCESS: ${error.code||error.name}: ${error.message}`);process.exitCode=1;}
