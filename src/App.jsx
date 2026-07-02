import { useState } from 'react';
import { generateBraille } from './generator.js';
import { playClickSound } from './audio.js';

const LINKS = [
  ['WEBSITE REPO', 'https://github.com/kaede982006/JongKaMakerSite'],
  ['VIEW SAMPLE', '/samples.txt'],
  ['VIEW LICENSE', 'https://github.com/kaede982006/JongKaMakerSite/blob/main/LICENSE'],
  ['ACCUSE THE DEVELOPER', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ']
];

export default function App() {
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState('PATTERN: READY');

  function generate() {
    playClickSound();
    const result = generateBraille();

    setOutput(result.text);
    setStatus(`PATTERN: ${result.label} / CHARS: ${result.analysis.length} / SCORE: ${result.score}`);
    console.info('[JongKaMaker]', result);
  }

  async function copy() {
    playClickSound();

    if (!output) {
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
    } catch {
      const textarea = document.querySelector('.maker-output');
      textarea?.focus();
      textarea?.select();
      document.execCommand('copy');
      textarea?.setSelectionRange(output.length, output.length);
    }

    setStatus(`COPY COMPLETE / ${status}`);
  }

  function clickLink() {
    playClickSound();
  }

  return (
    <>
      <h1>JongKaMaker: 종카어 생성기</h1>
      <section className="maker" aria-label="JongKaMaker generator">
        <textarea
          className="maker-output"
          readOnly
          spellCheck="false"
          aria-label="Generated JongKaMaker text"
          value={output}
        />
        <p className="maker-status" aria-live="polite">{status}</p>
        <div className="maker-actions">
          <button className="action-button" type="button" onClick={generate}>GENERATE</button>
          <button className="action-button" type="button" onClick={copy}>COPY</button>
        </div>
      </section>
      <nav className="grid" aria-label="JongKaMaker links">
        {LINKS.map(([label, href]) => (
          <div className="button" key={label}>
            <a href={href} target="_blank" rel="noreferrer" onClick={clickLink}>{label}</a>
          </div>
        ))}
      </nav>
    </>
  );
}
