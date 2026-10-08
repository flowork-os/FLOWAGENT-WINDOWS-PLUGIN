<div align="center">

# 🪟 Flowork OS Sovereign Plugin Registry (Windows)

**High-Performance Modular GUI & WASM Extensions for Sovereign AI Agents on Windows**

[![Windows](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011%20%7C%20Server-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/flowork-os/FLOWAGENT-WINDOWS-PLUGIN)
[![Runtime](https://img.shields.io/badge/Runtime-Node.js%20%7C%20WASM%20%7C%20Win32%20IPC-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://floworkos.com)
[![Distribution](https://img.shields.io/badge/Distribution-Zero--API%20CDN-00D26A?style=for-the-badge)](https://plugins.floworkos.com)
[![Architecture](https://img.shields.io/badge/Architecture-Nano--Modular%20Sharded-00F5FF?style=for-the-badge)](https://floworkos.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](https://github.com/flowork-os/FLOWAGENT-WINDOWS-PLUGIN/pulls)

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-verified-sovereign-plugins">Plugins Catalog</a> •
  <a href="#-architecture--specs">Architecture</a> •
  <a href="#-zero-api-cdn-installation">Installation</a> •
  <a href="#-plugin-manifest-specification">Plugin Manifest</a> •
  <a href="#-publishing-guidelines">Publishing</a>
</p>

---

</div>

## 🌟 Overview

The **Flowork OS Windows Plugin Registry** is the curated open-source repository of verified, sovereign extensions and desktop applications engineered specifically for **Flowork OS** and autonomous AI agents on Windows environments.

Engineered with the **Nano-Plug Architecture**, plugins deliver high-speed desktop interactivity without sacrificing LLM context or system performance:
- ⚡ **Zero Prompt Bloat**: Plugins remain off-context until summoned, preserving critical LLM context tokens.
- 🪟 **Native Windows & Canvas Integration**: Seamless execution inside Flowork Canvas UI powered by local Node.js, WASM, or Win32 backend daemons.
- 🛡️ **Zero-Zombie Process Supervision**: Robust Windows process tree termination (`taskkill /F /T`) ensures zero orphaned background services.
- 🚀 **Zero GitHub API Quota**: Distributed through high-speed Cloudflare edge caching and raw GitHub archive streaming.

---

## 📦 Verified Sovereign Plugins

| Icon | Plugin Name | ID | Version | Category | Description | Source & Shard |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- |
| ♟️ | **Sovereign Chess Arena** | `chess` | `1.0.0` | Games & Strategy | Dual-Actor Chess Arena: Human vs Agent AI. Play solo or duel with open Agent chat in real-time. | [`plugins/ch/chess`](plugins/ch/chess) • [`shard`](index/ch/es/chess.json) |
| 📹 | **YouTube Downloader & Suno Studio** | `yt-downloader` | `1.2.0` | Media & Network | Sovereign YouTube Video/Audio Extractor with 59s Anti-Copyright Speed Ramp for Suno AI, Custom Folders, and Multi-Format DSP. | [`plugins/yt/yt-downloader`](plugins/yt/yt-downloader) • [`shard`](index/yt/do/yt_downloader.json) |

*Want to add your plugin to the official Windows store? See the [Publishing Guidelines](#-publishing-guidelines).*

---

## 🏛️ Architecture & Specs

```
FLOWAGENT-WINDOWS-PLUGIN/
├── index/                        # O(1) Crates.io-style sharded lookup metadata
│   ├── ch/es/chess.json
│   └── yt/do/yt_downloader.json
├── plugins/                      # Sovereign plugin source roots
│   ├── ch/chess/
│   │   ├── plugin.manifest.json  # Plug & Play agnostic manifest
│   │   ├── SKILL.md              # 20-keyword Agent runbook & SOP
│   │   ├── gui/                  # HTML5 / Canvas frontend
│   │   └── engine/               # Node.js / WASM backend
│   └── yt/yt-downloader/
│       ├── plugin.manifest.json
│       ├── SKILL.md
│       ├── gui/
│       └── engine/
├── categories/                   # Category grouping indexes
├── plugins.json                  # Root registry index
└── README.md
```

### 1. Two-Tier Directory Sharding
To prevent Windows filesystem lookup degradation and ensure instant path resolution:
$$\text{Path} = \text{plugins}\backslash\{id[0..2]\}\backslash\{id\}$$
$$\text{Metadata Shard} = \text{index}\backslash\{id[0..2]\}\backslash\{id[2..4]\}\backslash\{id\}.\text{json}$$

### 2. Windows Process & Port Model
1. **Dynamic Port Injection**: Host allocates an available high-number port and passes `%FLOWORK_APP_PORT%` as an environment variable to the plugin process.
2. **Path Agnostic Runtime**: Paths are normalized across forward slashes and backslashes using Node.js `path.resolve` or Rust `std::path::PathBuf`.
3. **Graceful Teardown**: Inter-process communication sockets close gracefully, and host enforces cleanup on exit.

---

## 🚀 Zero-API CDN Installation

Install plugins directly in PowerShell without consuming GitHub API tokens:

```powershell
# PowerShell One-Liner CDN Extraction
$plugin = "chess"
$prefix = $plugin.Substring(0, 2)
$url = "https://codeload.github.com/flowork-os/FLOWAGENT-WINDOWS-PLUGIN/tar.gz/main"
Invoke-WebRequest -Uri $url -OutFile "temp.tar.gz"
tar -xzf "temp.tar.gz" --strip-components=3 -C "./plugins/" "FLOWAGENT-WINDOWS-PLUGIN-main/plugins/$prefix/$plugin"
Remove-Item "temp.tar.gz"
```

Or via Flowork Agent CLI:
```powershell
flowork plugin install chess
```

---

## 📋 Plugin Manifest Specification

Every plugin includes a mandatory `plugin.manifest.json`:

```json
{
  "id": "chess",
  "name": "Sovereign Chess Arena",
  "version": "1.0.0",
  "author": "Flowork OS & Community",
  "category": "Games & Strategy",
  "icon": "♟️",
  "description": "Dual-Actor Chess Arena: Human vs Agent AI with real-time IPC.",
  "entry": {
    "gui": "gui/index.html",
    "backend": "engine/server.mjs"
  },
  "ipc": {
    "port_env": "FLOWORK_APP_PORT",
    "default_port": 17820
  },
  "dependencies": {
    "system": ["node"],
    "npm": []
  }
}
```

---

## 🛠️ Publishing Guidelines

1. **Strict 1-Folder / 1-Plugin Isolation**: No external root dependencies; standalone execution.
2. **Mandatory `SKILL.md`**: Must provide agent instructions with exactly 20 English keywords in YAML frontmatter.
3. **Cross-Platform Portability**: Avoid hardcoded Windows drive letters (`C:\`); use relative paths and environment variables.
4. **No External CDN Leaks**: All styles, icons, scripts, and runtime binaries must be bundled locally.
5. **Windows 10 & 11 Verified**: Test execution in PowerShell 7+ and CMD.

### Submit via Pull Request
```bash
git checkout -b feature/win-plugin
# Place plugin in plugins/{prefix}/{plugin_id}
git add plugins/ index/ plugins.json
git commit -m "feat(plugin): add windows-compatible plugin"
git push origin feature/win-plugin
```

---

## 📄 License & Sovereignty

Licensed under the **MIT License**. Built with sovereign pride by the Flowork OS Community.

Co-authored-by: Flowork OS <agent@floworkos.com>
