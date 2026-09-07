const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const publicDir = path.join(__dirname, 'public');

// Debug: Check if public directory exists
if (!fs.existsSync(publicDir)) {
  console.error(`ERROR: Public directory not found at ${publicDir}`);
  process.exit(1);
}

// Serve static files from public directory
app.use(express.static(publicDir, {
  index: 'index.html'
}));

// SPA fallback - serve index.html for all routes
app.get('*', (req, res) => {
  const indexPath = path.join(publicDir, 'index.html');

  if (!fs.existsSync(indexPath)) {
    return res.status(404).send(`index.html not found at ${indexPath}`);
  }

  res.sendFile(indexPath);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Public directory: ${publicDir}`);
  console.log(`✓ Open your browser and navigate to http://localhost:${PORT}`);
});
