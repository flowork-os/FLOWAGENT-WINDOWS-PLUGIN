import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile, exec, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.FLOWORK_APP_PORT || '17898', 10);
const HOST = '127.0.0.1';
const GUI_DIR = path.resolve(__dirname, '..', 'gui');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.aac': 'audio/aac'
};

async function pickNativeFilePath(mode = 'open', initialFile = 'export.mp4') {
  const platform = os.platform();
  const defaultDir = path.join(os.homedir(), 'Videos');

  if (platform === 'linux') {
    return new Promise((resolve) => {
      const args = mode === 'save'
        ? ['--file-selection', '--save', `--confirm-overwrite`, `--filename=${path.join(defaultDir, initialFile)}`, '--title=Save Video As...']
        : ['--file-selection', `--filename=${defaultDir}/`, '--title=Select Video File...'];
      
      execFile('zenity', args, (err, stdout) => {
        if (!err && stdout.trim()) return resolve(stdout.trim());
        const pyScript = mode === 'save'
          ? `import tkinter, tkinter.filedialog as fd; r=tkinter.Tk(); r.withdraw(); print(fd.asksaveasfilename(initialfile='${initialFile}') or '')`
          : `import tkinter, tkinter.filedialog as fd; r=tkinter.Tk(); r.withdraw(); print(fd.askopenfilename() or '')`;
        execFile('python3', ['-c', pyScript], (err2, stdout2) => {
          resolve(!err2 && stdout2.trim() ? stdout2.trim() : null);
        });
      });
    });
  } else if (platform === 'win32') {
    const psScript = mode === 'save'
      ? `Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.SaveFileDialog; $d.FileName = '${initialFile}'; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.FileName }`
      : `Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.OpenFileDialog; if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.FileName }`;
    return new Promise((resolve) => {
      exec(`powershell -NoProfile -Command "${psScript}"`, (err, stdout) => {
        resolve(!err && stdout.trim() ? stdout.trim() : null);
      });
    });
  } else if (platform === 'darwin') {
    const osascript = mode === 'save'
      ? `POSIX path of (choose file name with prompt "Save video to:" default name "${initialFile}")`
      : `POSIX path of (choose file with prompt "Select video file:")`;
    return new Promise((resolve) => {
      execFile('osascript', ['-e', osascript], (err, stdout) => {
        resolve(!err && stdout.trim() ? stdout.trim() : null);
      });
    });
  }
  return null;
}

function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ];
    execFile('ffprobe', args, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      try {
        const info = JSON.parse(stdout);
        resolve(info);
      } catch (e) {
        reject(e);
      }
    });
  });
}

function formatTimeFFmpeg(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = (s % 60).toFixed(3);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.padStart(6, '0')}`;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, X-Requested-With');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  // API 1: Healthcheck
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', port: PORT, pid: process.pid, platform: os.platform() }));
  }

  // API 2: Pick Source Video
  if (pathname === '/api/pick-file') {
    try {
      const selected = await pickNativeFilePath('open');
      if (!selected) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, cancelled: true }));
      }
      const probe = await probeVideo(selected);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, filePath: selected, probe }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: e.message }));
    }
  }

  // API 2.1: Probe Directly via explicit path (for Drag & Drop / Input upload)
  if (pathname === '/api/probe-file' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        if (!payload.filePath || !fs.existsSync(payload.filePath)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: 'File path does not exist on disk' }));
        }
        const probe = await probeVideo(payload.filePath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, filePath: payload.filePath, probe }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API 2.2: Buffer Upload endpoint for HTML File Picker fallback
  if (pathname === '/api/upload-temp' && req.method === 'POST') {
    const filename = url.searchParams.get('name') || `upload_${Date.now()}.mp4`;
    const tempDir = path.join(os.tmpdir(), 'xflow_cutter_uploads');
    fs.mkdirSync(tempDir, { recursive: true });
    const targetFile = path.join(tempDir, filename);
    const writeStream = fs.createWriteStream(targetFile);

    req.pipe(writeStream);
    writeStream.on('finish', async () => {
      try {
        const probe = await probeVideo(targetFile);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, filePath: targetFile, probe }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    writeStream.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    });
    return;
  }

  // API 3: Pick Save Target
  if (pathname === '/api/pick-save') {
    try {
      const initial = url.searchParams.get('name') || 'cut-output.mp4';
      const selected = await pickNativeFilePath('save', initial);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: !!selected, filePath: selected }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: e.message }));
    }
  }

  // API 4: Stream Local Media (with HTTP Range request for video scrubbing)
  if (pathname === '/api/stream') {
    const targetFile = url.searchParams.get('file');
    if (!targetFile || !fs.existsSync(targetFile)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'File not found' }));
    }

    const stat = fs.statSync(targetFile);
    const fileSize = stat.size;
    const range = req.headers.range;
    const ext = path.extname(targetFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'video/mp4';

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(targetFile, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(targetFile).pipe(res);
    }
    return;
  }

  // API 5: Execute Cut / Join / Export via FFmpeg
  if (pathname === '/api/export' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { sourcePath, outputPath, segments, mode, speed } = payload;

        if (!sourcePath || !outputPath || !segments || segments.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: 'Invalid parameters' }));
        }

        const tmpDir = path.join(os.tmpdir(), `xflow_cut_${Date.now()}`);
        fs.mkdirSync(tmpDir, { recursive: true });

        // Single segment or multi-segment
        if (segments.length === 1) {
          const seg = segments[0];
          const startStr = formatTimeFFmpeg(seg.start);
          const duration = Math.max(0.01, seg.end - seg.start);

          let ffmpegArgs = [];
          if (mode === 'lossless' && (!speed || speed === 1.0)) {
            ffmpegArgs = [
              '-y',
              '-ss', startStr,
              '-i', sourcePath,
              '-t', duration.toString(),
              '-c', 'copy',
              '-avoid_negative_ts', 'make_zero',
              outputPath
            ];
          } else {
            // Re-encode or speed ramp
            const videoFilters = [];
            const audioFilters = [];
            if (speed && speed !== 1.0) {
              videoFilters.push(`setpts=${(1 / speed).toFixed(4)}*PTS`);
              audioFilters.push(`atempo=${speed}`);
            }

            ffmpegArgs = [
              '-y',
              '-ss', startStr,
              '-i', sourcePath,
              '-t', duration.toString()
            ];

            if (videoFilters.length > 0) {
              ffmpegArgs.push('-vf', videoFilters.join(','));
            }
            if (audioFilters.length > 0) {
              ffmpegArgs.push('-af', audioFilters.join(','));
            }

            ffmpegArgs.push(
              '-c:v', 'libx264',
              '-preset', 'veryfast',
              '-crf', '20',
              '-c:a', 'aac',
              '-b:a', '192k',
              outputPath
            );
          }

          execFile('ffmpeg', ffmpegArgs, (err, stdout, stderr) => {
            try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
            if (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ success: false, error: stderr || err.message }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, outputPath }));
          });
        } else {
          // Multi-segment concat
          const partFiles = [];
          for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const partOut = path.join(tmpDir, `part_${i}.mp4`);
            partFiles.push(partOut);
            const startStr = formatTimeFFmpeg(seg.start);
            const duration = Math.max(0.01, seg.end - seg.start);

            await new Promise((resolveSeg, rejectSeg) => {
              const segArgs = mode === 'lossless'
                ? ['-y', '-ss', startStr, '-i', sourcePath, '-t', duration.toString(), '-c', 'copy', '-avoid_negative_ts', 'make_zero', partOut]
                : ['-y', '-ss', startStr, '-i', sourcePath, '-t', duration.toString(), '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '22', '-c:a', 'aac', partOut];
              execFile('ffmpeg', segArgs, (errSeg, outSeg, errLog) => {
                if (errSeg) return rejectSeg(new Error(errLog || errSeg.message));
                resolveSeg(true);
              });
            });
          }

          // Concat parts
          const listTxtPath = path.join(tmpDir, 'concat_list.txt');
          const listContent = partFiles.map(f => `file '${f}'`).join('\n');
          fs.writeFileSync(listTxtPath, listContent, 'utf-8');

          const concatArgs = [
            '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', listTxtPath,
            '-c', 'copy',
            outputPath
          ];

          execFile('ffmpeg', concatArgs, (concatErr, stdout, stderr) => {
            try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_) {}
            if (concatErr) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({ success: false, error: stderr || concatErr.message }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, outputPath }));
          });
        }
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // API 6: Generate Waveform / Thumbnail strip
  if (pathname === '/api/thumbnails') {
    const videoFile = url.searchParams.get('file');
    const count = parseInt(url.searchParams.get('count') || '10', 10);
    if (!videoFile || !fs.existsSync(videoFile)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'File not found' }));
    }

    try {
      const probe = await probeVideo(videoFile);
      const duration = parseFloat(probe.format?.duration || 10);
      const interval = duration / (count + 1);
      const thumbs = [];

      for (let i = 1; i <= count; i++) {
        const timeAt = (interval * i).toFixed(2);
        const b64 = await new Promise((resolveThumb) => {
          const args = [
            '-ss', timeAt,
            '-i', videoFile,
            '-vframes', '1',
            '-vf', 'scale=160:-1',
            '-f', 'image2',
            '-vcodec', 'mjpeg',
            'pipe:1'
          ];
          const ff = spawn('ffmpeg', args);
          const chunks = [];
          ff.stdout.on('data', d => chunks.push(d));
          ff.on('close', code => {
            if (code === 0 && chunks.length > 0) {
              const buf = Buffer.concat(chunks);
              resolveThumb(`data:image/jpeg;base64,${buf.toString('base64')}`);
            } else {
              resolveThumb(null);
            }
          });
        });
        if (b64) thumbs.push({ time: parseFloat(timeAt), image: b64 });
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, thumbnails: thumbs }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: e.message }));
    }
  }

  // Static File Serving (GUI)
  let safePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(GUI_DIR, safePath);

  if (!filePath.startsWith(GUI_DIR)) {
    res.writeHead(403);
    return res.end('Access Denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      return res.end('File Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[X-Cutter Engine] Active on http://${HOST}:${PORT} (PID: ${process.pid})`);
});

const cleanup = (sig) => {
  console.log(`[X-Cutter Engine] Received ${sig}, shutting down cleanly...`);
  server.close(() => process.exit(0));
};

process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('SIGINT', () => cleanup('SIGINT'));
