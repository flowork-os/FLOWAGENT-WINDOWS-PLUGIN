import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile, exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.FLOWORK_APP_PORT || '17897', 10);
const HOST = '127.0.0.1';
const GUI_DIR = path.resolve(__dirname, '..', 'gui');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac'
};

async function pickNativeSavePath(initialPath) {
  const platform = os.platform();
  if (platform === 'linux') {
    return new Promise((resolve) => {
      execFile('zenity', [
        '--file-selection',
        '--save',
        '--confirm-overwrite',
        `--filename=${initialPath}`,
        '--title=Choose Save Location'
      ], (err, stdout) => {
        if (!err && stdout.trim()) {
          resolve(stdout.trim());
          return;
        }
        // Fallback: python3 tkinter
        const pyScript = `import tkinter, tkinter.filedialog as fd; root = tkinter.Tk(); root.withdraw(); print(fd.asksaveasfilename(initialfile='${initialPath}') or '')`;
        execFile('python3', ['-c', pyScript], (err2, stdout2) => {
          if (!err2 && stdout2.trim()) {
            resolve(stdout2.trim());
          } else {
            resolve(null);
          }
        });
      });
    });
  } else if (platform === 'win32') {
    const psScript = `Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.SaveFileDialog; $d.FileName = '${initialPath}'; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.FileName }`;
    return new Promise((resolve) => {
      exec(`powershell -NoProfile -Command "${psScript}"`, (err, stdout) => {
        resolve(!err && stdout.trim() ? stdout.trim() : null);
      });
    });
  } else if (platform === 'darwin') {
    const script = `POSIX path of (choose file name default name "${initialPath}" with prompt "Choose Save Location")`;
    return new Promise((resolve) => {
      execFile('osascript', ['-e', script], (err, stdout) => {
        resolve(!err && stdout.trim() ? stdout.trim() : null);
      });
    });
  }
  return null;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Target-Path, X-Filename');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', engine: 'x-studio-daw-v1.0.0', port: PORT }));
    return;
  }

  if (url.pathname === '/api/dialog/default-dir') {
    const home = os.homedir();
    const music = path.join(home, 'Music');
    const downloads = path.join(home, 'Downloads');
    const desktop = path.join(home, 'Desktop');
    const defaultDir = fs.existsSync(music) ? music : (fs.existsSync(downloads) ? downloads : desktop);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', home, default_dir: defaultDir }));
    return;
  }

  if (url.pathname === '/api/dialog/save-file') {
    const defaultName = url.searchParams.get('name') || 'x-studio-output.mp3';
    const home = os.homedir();
    const music = path.join(home, 'Music');
    const initialDir = fs.existsSync(music) ? music : home;
    const initialPath = path.join(initialDir, defaultName);

    const selectedPath = await pickNativeSavePath(initialPath);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (selectedPath) {
      res.end(JSON.stringify({ status: 'ok', path: selectedPath }));
    } else {
      res.end(JSON.stringify({ status: 'cancelled' }));
    }
    return;
  }

  if (url.pathname === '/api/fs/save-file' && req.method === 'POST') {
    const targetHeader = req.headers['x-target-path'] || '';
    if (!targetHeader) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Missing X-Target-Path header' }));
      return;
    }

    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      try {
        let dest = path.resolve(targetHeader);
        if (fs.existsSync(dest) && fs.statSync(dest).isDirectory()) {
          const fn = req.headers['x-filename'] || 'output.mp3';
          dest = path.join(dest, fn);
        }

        const parent = path.dirname(dest);
        if (!fs.existsSync(parent)) {
          fs.mkdirSync(parent, { recursive: true });
        }

        const buffer = Buffer.concat(chunks);
        await fs.promises.writeFile(dest, buffer);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', path: dest, bytes: buffer.length }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
    return;
  }

  // Static file serving from GUI directory
  let reqPath = url.pathname;
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  }

  const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(GUI_DIR, safePath);

  if (!filePath.startsWith(GUI_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[X-Studio Engine] Active on http://${HOST}:${PORT} (PID: ${process.pid})`);
});

const cleanup = (sig) => {
  console.log(`[X-Studio Engine] Received ${sig}, shutting down cleanly...`);
  server.close(() => process.exit(0));
};

process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('SIGINT', () => cleanup('SIGINT'));
