document.addEventListener('DOMContentLoaded', () => {
  const output = document.querySelector('.maker-output');
  const generateButton = document.querySelector('#generate-button');
  const copyButton = document.querySelector('#copy-button');
  const linkButtons = document.querySelectorAll('.button > a');

  const OUTPUT_CHARS = 120;
  const LINE_WIDTH = 32;
  const jongKaArray = Array.from({ length: 255 }, (_, index) =>
    String.fromCharCode(0x2801 + index)
  );

  let randomState = createSeed();

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

  function playClickSound() {
    const clickSound = new Audio('./rep.wav');
    clickSound.currentTime = 0;

    clickSound.play().catch((error) => {
      console.error('Audio play failed:', error);
    });
  }

  function generateOutput() {
    const result = [];

    for (let i = 0; i < OUTPUT_CHARS; i++) {
      result.push(i === 9 ? ' ' : jongKaArray[nextRandom() % jongKaArray.length]);

      if (i !== 0 && (i + 1) % LINE_WIDTH === 0) {
        result.push('\r\n');
      }
    }

    output.value = result.join('');
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
