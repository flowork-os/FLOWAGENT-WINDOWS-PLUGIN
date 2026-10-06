# 🎛️ X-STUDIO — PLUGIN SKILL
**Panduan Interaksi & Kolaborasi Digital Audio Workstation (DAW)**  
**Flowork OS (floworkos.com)**

---

## 1. Peran & Deskripsi Plugin
- **Nama Plugin**: X-Studio DAW (`x-studio`)
- **Fungsi Utama**: Digital Audio Workstation profesional, multitrack timeline editor, WebAssembly DSP suite, audio effects, dan high-fidelity audio renderer.
- **Engine Core**: Node.js engine server + WebAssembly audio DSP modules.

---

## 2. Alur Kolaborasi Human & AI
1. **User Mode (Human GUI)**:
   - Pengguna membuka tab `x-studio` di Canvas stage.
   - Mengedit trek audio, mengatur equalizer, menambahkan instrumen, dan merender trek akhir.
2. **AI Native Mode (Direct Agent Invocation)**:
   - AI membaca SKILL.md ini untuk mengetahui kapabilitas endpoint dan port aktif.
   - AI dapat menyimpan hasil render audio langsung via `/api/fs/save-file` dengan header `X-Target-Path`.
   - AI dapat berkoordinasi dengan dialog penyimpanan pengguna via `/api/dialog/save-file`.

---

## 3. Spesifikasi Endpoint API (Backend Engine)
- **`GET /health`**:
  - Mengecek status engine audio studio.
  - Respon: `{"status": "ok", "engine": "x-studio-daw-v1.0.0", "port": 17897}`
- **`GET /api/dialog/default-dir`**:
  - Mengambil direktori audio/music bawaan pengguna.
  - Respon: `{"status": "ok", "default_dir": "/home/.../Music"}`
- **`GET /api/dialog/save-file?name=<filename>`**:
  - Membuka dialog pemilih berkas native sistem host.
  - Respon: `{"status": "ok", "path": "/path/to/save.mp3"}`
- **`POST /api/fs/save-file`**:
  - Menyimpan raw stream buffer audio langsung ke disk host.
  - Header: `X-Target-Path: /path/to/destination.mp3`

---

## 4. Variabel Lingkungan & Port
- **Port Environment**: `FLOWORK_APP_PORT` atau `PORT`
- **Default Fallback Port**: `17897`
