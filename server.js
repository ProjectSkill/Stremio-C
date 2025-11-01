const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());

// HTML page at root
const STREMIO_WEB_HTML = `
<!DOCTYPE html>
<html>
<head><title>Custom Stremio</title></head>
<body>
  <h1>🎬 Custom Stremio Player</h1>
  <p>Add‑on URL: <code>https://your-app.onrender.com</code></p>
</body>
</html>
`;

app.get('/', (req, res) => {
  res.send(STREMIO_WEB_HTML);
});

// Manifest route
app.get('/manifest.json', (req, res) => {
  res.json({
    id: "custom.stremio",
    version: "1.0.0",
    name: "Custom Stremio with External Players",
    description: "A custom Stremio server running on Render",
    resources: ["stream"],
    types: ["movie", "series"],
    catalogs: []
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});