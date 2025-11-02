/* inject.js — BURGER MENU + 4-PLAYER MAGIC */
(() => {
  const css = `
#burger{position:fixed;top:12px;left:12px;z-index:99999;font-size:32px;background:#000000bb;color:#0f0;padding:8px 14px;border-radius:12px;cursor:pointer}
#box{position:fixed;top:60px;left:12px;right:12px;background:#111;color:#0f0;padding:16px;border-radius:12px;font-family:monospace;z-index:99999;display:none;box-shadow:0 0 20px #0f0}
.line{padding:10px 0;border-bottom:1px #333 solid;display:flex;justify-content:space-between;align-items:center}
.copy{background:#0f0;color:#000;padding:6px 12px;border-radius:8px;font-weight:bold;border:none;cursor:pointer}
.close{background:transparent;color:#0f0;border:none;font-size:20px;cursor:pointer;margin-left:8px}
`;
  try {
    document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
    document.body.insertAdjacentHTML('beforeend', `
<div id="burger" aria-label="menu" title="Open streams">☰</div>
<div id="box" role="dialog" aria-hidden="true"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><strong>Streams</strong><button class="close" id="box-close">✕</button></div><div id="box-list">Fetching…</div></div>
`);
  } catch (e) {
    console.error('inject.js: DOM insertion failed', e);
    return;
  }

  const burger = document.getElementById('burger');
  const box = document.getElementById('box');
  const boxList = document.getElementById('box-list');
  const boxClose = document.getElementById('box-close');

  function showBox() { box.style.display = 'block'; box.setAttribute('aria-hidden','false'); }
  function hideBox() { box.style.display = 'none'; box.setAttribute('aria-hidden','true'); }

  boxClose.onclick = hideBox;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideBox(); });

  burger.onclick = () => {
    const id = (location.href.match(/tt\d+/) || [])[0];
    if (!id) return alert('Open a movie first!');
    showBox();
    boxList.textContent = 'Fetching…';
    fetch(`/allstreams/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('bad upstream')))
      .then(list => {
        if (!Array.isArray(list) || list.length === 0) {
          boxList.innerHTML = '<div style="padding:8px 0">No streams found</div>';
          return;
        }
        boxList.innerHTML = list.map(s => `
          <div class="line">
            <span style="flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${s.quality} ${escapeHtml(s.title)}</span>
            <div style="display:flex;gap:8px">
              <button class="copy" data-url="${encodeAttr(s.url)}">COPY</button>
              <button class="copy" data-url="${encodeAttr(s.url)}" data-open="true">OPEN</button>
            </div>
          </div>`).join('');
        boxList.querySelectorAll('.copy').forEach(b => {
          b.onclick = () => {
            const url = b.dataset.url;
            if (b.dataset.open) return openChoice(url);
            copyUrl(url).catch(()=>{
              prompt('Copy this URL', url);
            });
          };
        });
      })
      .catch(err => {
        console.error('inject.js fetch error', err);
        boxList.innerHTML = '<div style="padding:8px 0">Failed to load streams</div>';
      });
  };

  function copyUrl(url) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(url);
    return Promise.reject(new Error('clipboard unavailable'));
  }

  function openChoice(url) {
    const n = prompt('OPEN IN?\n1 Infuse\n2 VidHub\n3 VLC\n4 Outplayer','1');
    const apps = {
      '1': 'infuse://x-callback-url/play?url=',
      '2': 'vidhub://open?url=',
      '3': 'vlc-x-callback://x-callback-url/stream?url=',
      '4': 'outplayer://play?url='
    };
    location.href = apps[n] ? apps[n] + encodeURIComponent(url) : url;
  }

  function escapeHtml(s='') {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function encodeAttr(s=''){ return escapeHtml(s).replace(/"/g,'&quot;'); }
})();