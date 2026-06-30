document.addEventListener('DOMContentLoaded', () => {
  const platform = navigator.userAgentData?.platform || navigator.platform || '';
  const isWindows = /windows|win32|win64/i.test(platform);

  document.body.classList.toggle('non-windows', !isWindows);

  const buttons = document.querySelectorAll('.button > a');

  buttons.forEach((button) => {
    button.addEventListener('click', (event) => {
      const href = button.href;
      const target = button.getAttribute('target');

      const clickSound = new Audio('./rep.wav');
      clickSound.currentTime = 0;

      clickSound.play().catch((error) => {
        console.error('Audio play failed:', error);
      });

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
