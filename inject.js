function copyAndChoosePlayer(url) {
  navigator.clipboard.writeText(url);
  const choice = prompt(
    'OPEN IN?\n1 Infuse 🔥\n2 VidHub ▶️\n3 VLC 📺\n4 Outplayer ⚡',
    '1'
  );
  const apps = {
    '1': 'infuse://x-callback-url/play?url=',          // Infuse Pro
    '2': 'vidhub://open?url=',                         // VidHub
    '3': 'vlc-x-callback://x-callback-url/stream?url=',// VLC
    '4': 'outplayer://play?url='                       // Outplayer
  };
  location.href = apps[choice] ? apps[choice] + encodeURIComponent(url) : url;
}