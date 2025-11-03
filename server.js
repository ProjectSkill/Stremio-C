// ────── RENDER-PROOF PORT ──────
const PORT = process.env.PORT || 11470;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Stremio ready → https://${process.env.RENDER_EXTERNAL_HOSTNAME}`);
  console.log(`   Internal port: ${PORT}`);
});