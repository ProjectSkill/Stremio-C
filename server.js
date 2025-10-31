const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Server is running 🚀');
});

const port = process.env.PORT || 8000;
const host = '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Listening on http://${host}:${port}`);
});