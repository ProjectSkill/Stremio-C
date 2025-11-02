// BURGER MENU + 4-PLAYER MAGIC
const css = `
#burger{position:fixed;top:12px;left:12px;z-index:99999;font-size:32px;background:#000000bb;color:#0f0;padding:8px 14px;border-radius:12px;cursor:pointer}
#box{position:fixed;top:60px;left:12px;right:12px;background:#111;color:#0f0;padding:16px;border-radius:12px;font-family:monospace;z-index:99999;display:none;box-shadow:0 0 20px #0f0}
.line{padding:10px 0;border-bottom:1px #333 solid;display:flex;justify-content:space-between}
.copy{background:#0f0;color:#000;padding:6px 12px;border-radius:8px;font-weight:bold}
`;
document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
document.body.insertAdjacentHTML('beforeend', `
<div id="burger">☰</div>
<div id="box">Fetching…</div>
`);
const burger = document.getElementById('burger');
const box = document.getElementById('box');

burger.onclick = () => {
  const id = location.href.match(/tt\d+/)?.[0];
  if (!id) return alert('Open a movie first!');
  box.style.display = 'block';
  fetch(`/allstreams/${id}`)
    .then(r => r.json())
    .then(list => {
      box.innerHTML = list.map(s => `
        <div class="line">
          <span>${s.quality} ${s.title}</span>
          <button class="copy" data-url="${s.url}">COPY</button>
        </div>`).join('');
      box.querySelectorAll('.copy').forEach(b => b.onclick = () => copy(b.dataset.url));
    });
};

function copy(url) {
  navigator.clipboard.writeText(url);
  const n = prompt('OPEN IN?\n1 Infuse 🔥\n2 VidHub ▶️\n3 VLC 📺\n4 Outplayer ⚡','1');
  const apps = {
    '1': 'infuse://x-callback-url/play?url=',
    '2': 'vidhub://open?url=',
    '3': 'vlc-x-callback://x-callback-url/stream?url=',
    '4': 'outplayer://play?url='
  };
  location.href = apps[n] ? apps[n] + encodeURIComponent(url) : url;
}