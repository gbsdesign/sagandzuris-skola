import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Resolve production build directory accurately across container layouts
const candidates = [
  path.resolve(__dirname, 'dist'),
  path.resolve(process.cwd(), 'dist'),
  path.resolve(__dirname),
  path.resolve(process.cwd())
];
let distPath = candidates.find(dir => fs.existsSync(path.join(dir, 'index.html'))) || path.resolve(__dirname, 'dist');

// Cloud Run health check endpoints for immediate 200 responses
app.get(['/healthz', '/livez', '/_ah/health', '/api/health'], (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Serve static assets from dist and public directories
app.use(express.static(distPath));
const publicDir = path.resolve(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

// Fallback to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Production server running on http://0.0.0.0:${PORT} serving ${distPath}`);
});
