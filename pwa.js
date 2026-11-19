// Service worker registration and the "Install app" prompt.
{
  const standalone =
    matchMedia('(display-mode: standalone)').matches ||
    matchMedia('(display-mode: fullscreen)').matches ||
    navigator.standalone === true;

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
    });
  }

  const wrap = document.getElementById('install');
  const btn = document.getElementById('installBtn');
  const iosHint = document.getElementById('iosHint');
  let deferred = null;

  // Android / desktop Chrome and Edge: show our own install button.
  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    if (!standalone) wrap.hidden = false;
  });

  btn.addEventListener('click', async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch (e) {}
    deferred = null;
    wrap.hidden = true;
  });

  addEventListener('appinstalled', () => { wrap.hidden = true; });

  // iOS Safari has no install prompt, so explain the Share-sheet route.
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS && !standalone) iosHint.hidden = false;
}
