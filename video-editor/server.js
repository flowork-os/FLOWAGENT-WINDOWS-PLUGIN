// [FLOWORKOS:NANO-PLUG] - server.js
// Module: VideoStudioBackend (Sovereign Local Render Engine & Asset Gateway)
// Doctrine: 1File-1Logic, Multi-OS Portable, Local-First FFmpeg Pipeline

const http = require('http');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.FLOWORK_APP_PORT || process.env.PORT || '5174', 10);
const WORKSPACE = process.env.FLOWORK_WORKSPACE || path.resolve(__dirname, '..', '..');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const host = req.headers.host || (req.socket.localAddress + ':' + req.socket.localPort);
  const parsedUrl = new URL(req.url, 'http://' + host);
  const pathname = parsedUrl.pathname;

  // 1. Health Status & FFmpeg Probe
  if (pathname === '/api/status' && req.method === 'GET') {
    exec('ffmpeg -version', (err, stdout) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        plugin: 'video-editor',
        status: 'READY',
        ffmpegAvailable: !err,
        ffmpegVersion: stdout ? stdout.split('\n')[0] : 'N/A',
        workspace: WORKSPACE
      }));
    });
    return;
  }

  // 2. Local Projects List
  if (pathname === '/api/projects' && req.method === 'GET') {
    const projectsDir = path.join(WORKSPACE, 'videos');
    if (!fs.existsSync(projectsDir)) {
      try { fs.mkdirSync(projectsDir, { recursive: true }); } catch (_) {}
    }
    fs.readdir(projectsDir, { withFileTypes: true }, (err, entries) => {
      const list = (entries || [])
        .filter(e => e.isDirectory())
        .map(e => ({ name: e.name, path: path.join(projectsDir, e.name) }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ projects: list }));
    });
    return;
  }

  // 3. Native FFmpeg Export Dispatcher
  if (pathname === '/api/timeline/export' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { inputFile, outputFile, inPoint, duration } = payload;
        if (!inputFile || !outputFile) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Missing inputFile or outputFile' }));
        }

        const args = ['-y'];
        if (inPoint !== undefined) args.push('-ss', String(inPoint));
        args.push('-i', inputFile);
        if (duration !== undefined) args.push('-t', String(duration));
        args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-c:a', 'aac', '-b:a', '192k', outputFile);

        const proc = spawn('ffmpeg', args);
        let errorOutput = '';
        proc.stderr.on('data', data => errorOutput += data.toString());
        proc.on('close', code => {
          res.writeHead(code === 0 ? 200 : 500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: code === 0,
            exitCode: code,
            outputFile,
            error: code !== 0 ? errorOutput.slice(-300) : null
          }));
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[VideoStudioBackend] Running on port ${PORT}`);
});
