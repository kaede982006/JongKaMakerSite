document.addEventListener('DOMContentLoaded', () => {
  const output = document.querySelector('.maker-output');
  const status = document.querySelector('.maker-status');
  const generateButton = document.querySelector('#generate-button');
  const copyButton = document.querySelector('#copy-button');
  const linkButtons = document.querySelectorAll('.button > a');

  const CANDIDATE_ATTEMPTS = 96;
  const OUTPUT_CHARS = 120;
  const BLANK_CELL = '⠀';
  const FULL_CELL = '⣿';
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

  let randomState = createSeed();
  let lastPatternStatus = 'PATTERN: READY';

  function createSeed() {
    const randomValues = new Uint32Array(1);

    if (window.crypto?.getRandomValues) {
      window.crypto.getRandomValues(randomValues);
    } else {
      randomValues[0] = Math.floor(Math.random() * 0xffffffff);
    }

    return (Date.now() ^ randomValues[0]) >>> 0 || 1;
  }

  function nextRandom() {
    randomState = (Math.imul(randomState, 1103515245) + 12345) >>> 0;
    return randomState;
  }

  function randomInt(max) {
    return nextRandom() % max;
  }

  function pick(values) {
    return values[randomInt(values.length)];
  }

  function playClickSound() {
    const clickSound = new Audio('./rep.wav');
    clickSound.currentTime = 0;

    clickSound.play().catch((error) => {
      console.error('Audio play failed:', error);
    });
  }

  function buildRun(length, pool = MIXED_BRAILLE) {
    const result = [];

    for (let i = 0; i < length; i++) {
      result.push(pick(pool));
    }

    return result;
  }

  function fitOutput(chars) {
    const result = chars.slice(0, OUTPUT_CHARS);

    while (result.length < OUTPUT_CHARS) {
      result.push(pick(MIXED_BRAILLE));
    }

    if (!result.includes(BLANK_CELL)) {
      result[randomInt(result.length)] = BLANK_CELL;
    }

    return result.join('');
  }

  function createDenseFlood() {
    return {
      label: 'DENSE FLOOD',
      text: fitOutput(buildRun(OUTPUT_CHARS, MIXED_BRAILLE))
    };
  }

  function createBlankStatic() {
    const chars = buildRun(OUTPUT_CHARS, DENSE_BRAILLE);
    const blankStride = 3 + randomInt(4);
    const startOffset = randomInt(blankStride);

    for (let i = startOffset; i < chars.length; i += blankStride) {
      chars[i] = pick(BLANK_NOISE);
    }

    return {
      label: 'BLANK STATIC',
      text: fitOutput(chars)
    };
  }

  function createEdgePulse() {
    const chunks = [];

    while (chunks.length < OUTPUT_CHARS) {
      chunks.push(
        ...buildRun(2 + randomInt(4), SPARSE_BRAILLE),
        ...buildRun(8 + randomInt(12), DENSE_BRAILLE),
        ...buildRun(1 + randomInt(3), BLANK_NOISE)
      );
    }

    return {
      label: 'EDGE PULSE',
      text: fitOutput(chunks)
    };
  }

  function createCandidate(pattern) {
    switch (pattern.id) {
      case 'blankStatic':
        return createBlankStatic();
      case 'edgePulse':
        return createEdgePulse();
      case 'denseFlood':
      default:
        return createDenseFlood();
    }
  }

  function analyzeText(text) {
    const chars = [...text];
    const brailleChars = chars.filter((char) => char >= '⠀' && char <= '⣿');
    const denseChars = brailleChars.filter((char) => DENSE_BRAILLE.includes(char));
    const fullCells = brailleChars.filter((char) => char === FULL_CELL);
    const blankCells = brailleChars.filter((char) => char === BLANK_CELL);
    const hasKorean = /[가-힣]/.test(text);
    const hasReservedXml = /[<>&"']/.test(text);

    return {
      length: chars.length,
      brailleCount: brailleChars.length,
      denseCount: denseChars.length,
      fullCellCount: fullCells.length,
      blankCellCount: blankCells.length,
      hasKorean,
      hasReservedXml
    };
  }

  function validateOutput(text) {
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

  function createFallback() {
    return {
      label: 'BRAILLE FALLBACK',
      text: fitOutput([
        ...FULL_CELL.repeat(24),
        ...BLANK_CELL.repeat(8),
        ...FULL_CELL.repeat(28),
        ...BLANK_CELL.repeat(8),
        ...FULL_CELL.repeat(52)
      ])
    };
  }

  function setStatus(message) {
    if (status) {
      status.textContent = message;
    }
  }

  function generateOutput() {
    const selectedPattern = pick(PATTERNS);
    let bestCandidate = null;
    let bestScore = -Infinity;

    for (let i = 0; i < CANDIDATE_ATTEMPTS; i++) {
      const candidate = createCandidate(selectedPattern);

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
      bestCandidate = createFallback();
      bestScore = scoreCandidate(bestCandidate);
    }

    output.value = bestCandidate.text;
    lastPatternStatus = `PATTERN: ${bestCandidate.label} / CHARS: ${[...bestCandidate.text].length} / SCORE: ${bestScore}`;
    setStatus(lastPatternStatus);
    console.info('[JongKaMaker]', {
      pattern: bestCandidate.label,
      score: bestScore,
      analysis: analyzeText(bestCandidate.text)
    });
  }

  function fallbackCopy() {
    output.focus();
    output.select();
    document.execCommand('copy');
    output.setSelectionRange(output.value.length, output.value.length);
  }

  generateButton.addEventListener('click', () => {
    playClickSound();
    generateOutput();
  });

  copyButton.addEventListener('click', async () => {
    playClickSound();

    if (!output.value) {
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API is unavailable.');
      }

      await navigator.clipboard.writeText(output.value);
    } catch (error) {
      fallbackCopy();
    }

    setStatus(`COPY COMPLETE / ${lastPatternStatus}`);
  });

  linkButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      const href = button.href;
      const target = button.getAttribute('target');

      playClickSound();

      if (target === '_blank') {
        return;
      }

      event.preventDefault();

      setTimeout(() => {
        window.location.href = href;
      }, 200);
    });
  });
});
