const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const outputDirectory = path.resolve(projectRoot, 'dist');

if (path.dirname(outputDirectory) !== projectRoot || path.basename(outputDirectory) !== 'dist') {
    throw new Error(`Refusing to clean unexpected output path: ${outputDirectory}`);
}

fs.rmSync(outputDirectory, { recursive: true, force: true });
console.log('[clean] Removed dist/');
