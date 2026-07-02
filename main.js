document.addEventListener('DOMContentLoaded', () => {
  const output = document.querySelector('.maker-output');
  const status = document.querySelector('.maker-status');
  const generateButton = document.querySelector('#generate-button');
  const copyButton = document.querySelector('#copy-button');
  const linkButtons = document.querySelectorAll('.button > a');

  const CANDIDATE_ATTEMPTS = 64;
  const MIN_OUTPUT_CHARS = 80;
  const MAX_OUTPUT_CHARS = 160;
  const LINE_WIDTH = 32;
  const MAX_LEAD_IN = 8;
  const FULL_CELL = '⣿';
  const KOREAN_ANCHORS = ['어우', '아', '으', '않기도전에', '어'];
  const LEAD_IN_BRAILLE = ['⠄', '⠂', '⡀', '⢀', '⠐', '⠠', '⣀'];
  const DENSE_BRAILLE = [
    '⣿', '⣿', '⣿', '⣿', '⣿', '⣿', '⣿', '⣿',
    '⠿', '⠿', '⣶', '⣷', '⣾', '⡿', '⢿', '⣻',
    '⣼', '⣽', '⣯', '⣟', '⣏', '⢻'
  ];
  const PATTERNS = [
    { id: 'fullCellBurst', label: 'FULL CELL' },
    { id: 'sparseLeadIn', label: 'SPARSE LEAD-IN' },
    { id: 'koreanInterrupt', label: 'KOREAN INTERRUPT' }
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

  function buildRun(length, pool = DENSE_BRAILLE) {
    const result = [];

    for (let i = 0; i < length; i++) {
      result.push(pick(pool));
    }

    return result.join('');
  }

  function buildLine(parts) {
    const line = parts.join('');
    return line.length > LINE_WIDTH ? line.slice(0, LINE_WIDTH) : line;
  }

  function createFullCellBurst() {
    const lines = [
      buildLine([buildRun(3 + randomInt(5), LEAD_IN_BRAILLE), pick(KOREAN_ANCHORS), buildRun(8 + randomInt(10))]),
      buildLine([buildRun(28 + randomInt(5))]),
      buildLine([buildRun(30 + randomInt(3))]),
      buildLine([buildRun(10 + randomInt(8)), pick(KOREAN_ANCHORS), buildRun(8 + randomInt(8))]),
      buildLine([buildRun(23 + randomInt(8))])
    ];

    return {
      label: 'FULL CELL',
      text: lines.join('\r\n')
    };
  }

  function createSparseLeadIn() {
    const lines = [
      buildLine([buildRun(5 + randomInt(7), LEAD_IN_BRAILLE), pick(KOREAN_ANCHORS), buildRun(5 + randomInt(7))]),
      buildLine([buildRun(26 + randomInt(7))]),
      buildLine([buildRun(24 + randomInt(9))]),
      buildLine([buildRun(8 + randomInt(7)), pick(KOREAN_ANCHORS), buildRun(10 + randomInt(8))]),
      buildLine([buildRun(20 + randomInt(10))])
    ];

    return {
      label: 'SPARSE LEAD-IN',
      text: lines.join('\r\n')
    };
  }

  function createKoreanInterrupt() {
    const lines = [
      buildLine([pick(KOREAN_ANCHORS), buildRun(12 + randomInt(10))]),
      buildLine([buildRun(12 + randomInt(8)), pick(KOREAN_ANCHORS), buildRun(7 + randomInt(8))]),
      buildLine([buildRun(28 + randomInt(5))]),
      buildLine([buildRun(7 + randomInt(7)), pick(KOREAN_ANCHORS), buildRun(11 + randomInt(7))]),
      buildLine([buildRun(20 + randomInt(10))])
    ];

    return {
      label: 'KOREAN INTERRUPT',
      text: lines.join('\r\n')
    };
  }

  function createCandidate(pattern) {
    switch (pattern.id) {
      case 'fullCellBurst':
        return createFullCellBurst();
      case 'sparseLeadIn':
        return createSparseLeadIn();
      case 'koreanInterrupt':
        return createKoreanInterrupt();
      default:
        return createFullCellBurst();
    }
  }

  function analyzeText(text) {
    const visibleChars = [...text.replace(/\r?\n/g, '')];
    const brailleChars = visibleChars.filter((char) => char >= '⠀' && char <= '⣿');
    const denseChars = brailleChars.filter((char) => DENSE_BRAILLE.includes(char));
    const fullCells = brailleChars.filter((char) => char === FULL_CELL);
    const hasKorean = /[가-힣]/.test(text);
    const hasReservedXml = /[<>&"']/.test(text);
    const hasBlankBraille = text.includes('⠀');
    const leadIn = [...text.replace(/\r?\n/g, '')].slice(0, MAX_LEAD_IN).join('');
    const hasEarlyReadableAnchor = /[가-힣 ]/.test(leadIn);
    const lines = text.split(/\r\n/);

    return {
      visibleLength: visibleChars.length,
      brailleCount: brailleChars.length,
      denseCount: denseChars.length,
      fullCellCount: fullCells.length,
      hasKorean,
      hasReservedXml,
      hasBlankBraille,
      hasEarlyReadableAnchor,
      maxLineLength: Math.max(...lines.map((line) => [...line].length)),
      lineCount: lines.length
    };
  }

  function validateOutput(text) {
    const analysis = analyzeText(text);

    return (
      analysis.visibleLength >= MIN_OUTPUT_CHARS &&
      analysis.visibleLength <= MAX_OUTPUT_CHARS &&
      analysis.maxLineLength <= LINE_WIDTH &&
      analysis.hasKorean &&
      analysis.hasEarlyReadableAnchor &&
      !analysis.hasReservedXml &&
      !analysis.hasBlankBraille
    );
  }

  function scoreCandidate(candidate) {
    const analysis = analyzeText(candidate.text);
    const brailleRatio = analysis.brailleCount / Math.max(analysis.visibleLength, 1);
    const denseRatio = analysis.denseCount / Math.max(analysis.brailleCount, 1);
    const fullCellRatio = analysis.fullCellCount / Math.max(analysis.brailleCount, 1);
    const lineBonus = analysis.lineCount >= 4 ? 24 : 0;
    const koreanPenalty = analysis.visibleLength - analysis.brailleCount > 12 ? 12 : 0;

    return Math.round(
      brailleRatio * 90 +
      denseRatio * 80 +
      fullCellRatio * 70 +
      lineBonus -
      koreanPenalty
    );
  }

  function createFallback() {
    return {
      label: 'FULL CELL FALLBACK',
      text: [
        `어우${FULL_CELL.repeat(18)}`,
        FULL_CELL.repeat(32),
        `${FULL_CELL.repeat(15)}않기도전에${FULL_CELL.repeat(8)}`,
        FULL_CELL.repeat(28)
      ].join('\r\n')
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
    lastPatternStatus = `PATTERN: ${bestCandidate.label} / SCORE: ${bestScore}`;
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
