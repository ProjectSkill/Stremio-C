const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");

const builder = new addonBuilder({
  id: "org.stremio.hello",
  version: "1.0.0",
  name: "🚀 Hello Stremio",
  description: "Instant addon – shows Big Buck Bunny",
  resources: ["stream"],
  types: ["movie"],
  idPrefixes: ["tt"]
});

builder.defineStreamHandler(args => {
  if (args.id === "tt1254207") {
    return Promise.resolve({ streams: [{ url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4", title: "Big Buck Bunny 1080p" }] });
  }
  return Promise.resolve({ streams: [] });
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
console.log("Stremio addon running → add https://YOUR-USERNAME.github.io/YOUR-REPO/manifest.json");