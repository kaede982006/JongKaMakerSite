import { readFileSync } from 'node:fs';
import { generateBraille, validateOutput } from '../app/src/generator.js';

for (let i = 0; i < 50; i++) {
  const result = generateBraille(i + 1);

  if (!validateOutput(result.text)) {
    throw new Error(`Invalid generated output for seed ${i + 1}`);
  }
}

const text = readFileSync('app/public/samples.txt', 'utf8');

if (/[가-힣]/.test(text)) {
  throw new Error('app/public/samples.txt: Korean found');
}

const sampleLines = text.split(/\r?\n/).filter((line) => line && !line.startsWith('PATTERN:'));

for (const [index, line] of sampleLines.entries()) {
  const chars = [...line];

  if (chars.length !== 120) {
    throw new Error(`app/public/samples.txt: sample ${index + 1} has ${chars.length} chars`);
  }

  if (!chars.every((char) => char >= '⠀' && char <= '⣿')) {
    throw new Error(`app/public/samples.txt: sample ${index + 1} has non-braille`);
  }

  if (!chars.includes('⠀')) {
    throw new Error(`app/public/samples.txt: sample ${index + 1} has no blank braille`);
  }
}

console.log('generator validation OK');
