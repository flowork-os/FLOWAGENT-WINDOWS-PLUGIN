# SKILL.MD — X-Cutter Video Studio

> **Plugin ID**: `x-cutter`  
> **Kategori**: Media & Video Editing  
> **Kompatibilitas**: Linux, Windows, macOS (Multi-OS Sovereign X-Flow)  
> **Port Baku**: 17898 (`$FLOWORK_APP_PORT`)

---

## 1. Deskripsi & Kapabilitas
`x-cutter` adalah plugin Video Editor dan Smart Trimmer non-linear berdaulat di Flowork OS yang diinspirasi dari repositori trending **mifi/lossless-cut**.

### Fitur Utama:
1. **Lossless Cut / Direct Stream Copy**: Memotong video pada keyframe tanpa re-encoding (kecepatan tulis filesystem instan, zero quality loss).
2. **Smart Re-encode Mode**: Pemotongan presisi frame-accurate berbasis FFmpeg x264/AAC.
3. **Multi-Segment Timeline**: Memotong beberapa segmen sekaligus dan menggabungkannya kembali secara otomatis (*auto-concat*).
4. **Thumbnail Filmstrip Track**: Ekstraksi cuplikan frame video dinamis untuk navigasi visual timeline.
5. **Frame-Accurate Scrubbing**: Navigasi maju/mundur per-frame dengan hotkey industri (Space, J, K, L, I, O).

---

## 2. Spesifikasi Endpoint HTTP IPC Engine (`server.mjs`)

| Method | Endpoint | Query / Body | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | - | Healthcheck port, OS platform, dan PID status |
| `GET` | `/api/pick-file` | - | Membuka dialog pemilih berkas video host native |
| `GET` | `/api/pick-save` | `name=<filename>` | Membuka dialog simpan berkas video host native |
| `GET` | `/api/stream` | `file=<path>` | HTTP Range streaming video lokal untuk player HTML5 |
| `GET` | `/api/thumbnails` | `file=<path>&count=12` | Ekstraksi array Base64 frame snapshot untuk filmstrip |
| `POST` | `/api/export` | `{ sourcePath, outputPath, segments, mode, speed }` | Eksekusi FFmpeg cut/join lossless atau re-encode |

---

## 3. Keyboard Shortcuts
- `Space` / `K` : Play / Pause
- `I` : Set Mark In (titik awal segmen)
- `O` : Set Mark Out (titik akhir segmen)
- `Left` / `J` : 1 Frame Mundur
- `Right` / `L` : 1 Frame Maju
