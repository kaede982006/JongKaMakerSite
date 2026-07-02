export const OUTPUT_CHARS = 120;
export const BLANK_CELL = '⠀';
export const FULL_CELL = '⣿';

const SPARSE_BRAILLE = ['⠄', '⠂', '⡀', '⢀', '⠐', '⠠', '⣀', '⠁', '⠈'];
const DENSE_BRAILLE = [
  '⣿', '⣿', '⣿', '⣿', '⣿', '⣿', '⣿', '⣿', '⣿', '⣿',
  '⠿', '⠿', '⣶', '⣷', '⣾', '⡿', '⢿', '⣻',
  '⣼', '⣽', '⣯', '⣟', '⣏', '⢻', '⣹', '⣸'
];
const BLANK_NOISE = [
  BLANK_CELL, BLANK_CELL, BLANK_CELL, BLANK_CELL, BLANK_CELL,
  '⠄', '⠂', '⡀', '⢀', '⠐', '⠠'
];
const MIXED_BRAILLE = [
  ...DENSE_BRAILLE,
  ...DENSE_BRAILLE,
  ...SPARSE_BRAILLE,
  BLANK_CELL,
  BLANK_CELL,
  BLANK_CELL
];
const PATTERNS = [
  { id: 'denseFlood', label: 'DENSE FLOOD' },
  { id: 'blankStatic', label: 'BLANK STATIC' },
  { id: 'edgePulse', label: 'EDGE PULSE' }
];

function createSeed() {
  const values = new Uint32Array(1);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  } else {
    values[0] = Math.floor(Math.random() * 0xffffffff);
  }

  return (Date.now() ^ values[0]) >>> 0 || 1;
}

function createRandom(seed = createSeed()) {
  let state = seed >>> 0 || 1;

  return (max) => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return state % max;
  };
}

function pick(values, randomInt) {
  return values[randomInt(values.length)];
}

function buildRun(length, pool, randomInt) {
  const result = [];

  for (let i = 0; i < length; i++) {
    result.push(pick(pool, randomInt));
  }

  return result;
}

function fitOutput(chars, randomInt) {
  const result = chars.slice(0, OUTPUT_CHARS);

  while (result.length < OUTPUT_CHARS) {
    result.push(pick(MIXED_BRAILLE, randomInt));
  }

  if (!result.includes(BLANK_CELL)) {
    result[randomInt(result.length)] = BLANK_CELL;
  }

  return result.join('');
}

function denseFlood(randomInt) {
  return {
    label: 'DENSE FLOOD',
    text: fitOutput(buildRun(OUTPUT_CHARS, MIXED_BRAILLE, randomInt), randomInt)
  };
}

function blankStatic(randomInt) {
  const chars = buildRun(OUTPUT_CHARS, DENSE_BRAILLE, randomInt);
  const blankStride = 3 + randomInt(4);
  const startOffset = randomInt(blankStride);

  for (let i = startOffset; i < chars.length; i += blankStride) {
    chars[i] = pick(BLANK_NOISE, randomInt);
  }

  return {
    label: 'BLANK STATIC',
    text: fitOutput(chars, randomInt)
  };
}

function edgePulse(randomInt) {
  const chunks = [];

  while (chunks.length < OUTPUT_CHARS) {
    chunks.push(
      ...buildRun(2 + randomInt(4), SPARSE_BRAILLE, randomInt),
      ...buildRun(8 + randomInt(12), DENSE_BRAILLE, randomInt),
      ...buildRun(1 + randomInt(3), BLANK_NOISE, randomInt)
    );
  }

  return {
    label: 'EDGE PULSE',
    text: fitOutput(chunks, randomInt)
  };
}

export function analyzeText(text) {
  const chars = [...text];
  const brailleChars = chars.filter((char) => char >= '⠀' && char <= '⣿');
  const denseChars = brailleChars.filter((char) => DENSE_BRAILLE.includes(char));
  const fullCells = brailleChars.filter((char) => char === FULL_CELL);
  const blankCells = brailleChars.filter((char) => char === BLANK_CELL);

  return {
    length: chars.length,
    brailleCount: brailleChars.length,
    denseCount: denseChars.length,
    fullCellCount: fullCells.length,
    blankCellCount: blankCells.length,
    hasKorean: /[가-힣]/.test(text),
    hasReservedXml: /[<>&"']/.test(text)
  };
}

export function validateOutput(text) {
  const analysis = analyzeText(text);

  return (
    analysis.length === OUTPUT_CHARS &&
    analysis.brailleCount === OUTPUT_CHARS &&
    analysis.blankCellCount > 0 &&
    !analysis.hasKorean &&
    !analysis.hasReservedXml
  );
}

function scoreCandidate(candidate) {
  const analysis = analyzeText(candidate.text);
  const denseRatio = analysis.denseCount / Math.max(analysis.brailleCount, 1);
  const fullCellRatio = analysis.fullCellCount / Math.max(analysis.brailleCount, 1);
  const blankRatio = analysis.blankCellCount / Math.max(analysis.brailleCount, 1);
  const blankTargetBonus = Math.max(0, 1 - Math.abs(blankRatio - 0.12)) * 40;

  return Math.round(
    denseRatio * 110 +
    fullCellRatio * 95 +
    blankTargetBonus
  );
}

function createCandidate(pattern, randomInt) {
  switch (pattern.id) {
    case 'blankStatic':
      return blankStatic(randomInt);
    case 'edgePulse':
      return edgePulse(randomInt);
    case 'denseFlood':
    default:
      return denseFlood(randomInt);
  }
}

function fallback(randomInt) {
  return {
    label: 'BRAILLE FALLBACK',
    text: fitOutput([
      ...FULL_CELL.repeat(24),
      ...BLANK_CELL.repeat(8),
      ...FULL_CELL.repeat(28),
      ...BLANK_CELL.repeat(8),
      ...FULL_CELL.repeat(52)
    ], randomInt)
  };
}

export function generateBraille(seed) {
  const randomInt = createRandom(seed);
  const selectedPattern = pick(PATTERNS, randomInt);
  let bestCandidate = null;
  let bestScore = -Infinity;

  for (let i = 0; i < 96; i++) {
    const candidate = createCandidate(selectedPattern, randomInt);

    if (!validateOutput(candidate.text)) {
      continue;
    }

    const score = scoreCandidate(candidate);
    if (score > bestScore) {
      bestCandidate = candidate;
      bestScore = score;
    }
  }

  if (!bestCandidate) {
    bestCandidate = fallback(randomInt);
    bestScore = scoreCandidate(bestCandidate);
  }

  return {
    ...bestCandidate,
    score: bestScore,
    analysis: analyzeText(bestCandidate.text)
  };
}
