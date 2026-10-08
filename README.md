<div align="center">

# 🪟 Flowork OS Sovereign Plugin Registry (Windows)

**High-Performance Modular GUI & WASM Extension Registry for Sovereign AI Agents on Windows**

[![Windows](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011%20%7C%20Server-0078D4?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/flowork-os/FLOWAGENT-WINDOWS-PLUGIN)
[![Runtime](https://img.shields.io/badge/Runtime-Node.js%20%7C%20WASM%20%7C%20Win32%20IPC-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://floworkos.com)
[![Distribution](https://img.shields.io/badge/Distribution-Zero--API%20CDN-00D26A?style=for-the-badge)](https://plugins.floworkos.com)
[![Architecture](https://img.shields.io/badge/Architecture-Nano--Modular%20Sharded-00F5FF?style=for-the-badge)](https://floworkos.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](https://github.com/flowork-os/FLOWAGENT-WINDOWS-PLUGIN/pulls)

<br />

<a href="https://github.com/flowork-os/FLOWORK-AGENT">
  <img src="https://img.shields.io/badge/%E2%9A%A1%20DOWNLOAD%20FLOWORK%20AGENT-INSTALL%20NOW%20%E2%86%92-FF0055?style=for-the-badge&logo=rocket&logoColor=white&labelColor=0D1117" alt="Download Flowork Agent" height="54" />
</a>

<br /><br />

<p align="center">
  <a href="#-get-the-flowork-agent">Download Agent</a> •
  <a href="#-overview">Overview</a> •
  <a href="#-dynamic-discovery--app-store">Discovery</a> •
  <a href="#-architecture--specs">Architecture</a> •
  <a href="#-zero-api-cdn-installation">Installation</a> •
  <a href="#-plugin-manifest-specification">Manifest Spec</a> •
  <a href="#-publishing-guidelines">Publishing</a>
</p>

---

</div>

## ⚡ Get the Flowork Agent

To execute sovereign plugins, launch interactive canvas webviews, and orchestrate zero-conflict IPC runtimes, download and install the official **Flowork Agent Engine**:

<div align="center">

[![Download Flowork Agent](https://img.shields.io/badge/%E2%9A%A1%20DOWNLOAD%20FLOWORK%20AGENT-CLICK%20TO%20GET%20STARTED-FF0055?style=for-the-badge&logo=github&logoColor=white&labelColor=0D1117)](https://github.com/flowork-os/FLOWORK-AGENT)

**[👉 https://github.com/flowork-os/FLOWORK-AGENT 👈](https://github.com/flowork-os/FLOWORK-AGENT)**

*Native support for Windows 10/11 • Linux (x86_64, AArch64) • macOS*

</div>

---

## 🌟 Overview

The **Flowork OS Windows Plugin Registry** is the decentralized package registry for verified sovereign extensions and desktop applications engineered specifically for **Flowork OS** and autonomous AI agents on Windows.

Engineered with the **Nano-Plug Architecture**, plugins deliver high-speed desktop interactivity without sacrificing LLM context or system performance:
- ⚡ **Zero Prompt Bloat**: Extensions remain off-context until summoned, preserving critical LLM context tokens.
- 🪟 **Native Windows & Canvas Integration**: Seamless execution inside Flowork Canvas UI powered by local Node.js, WASM, or Win32 backend daemons.
- 🛡️ **Zero-Zombie Supervision**: Robust Windows process tree termination (`taskkill /F /T`) ensures zero orphaned background services.
- 🚀 **Zero GitHub API Quota**: Distributed through high-speed Cloudflare edge caching and raw GitHub archive streaming.

---

## 🔍 Dynamic Discovery & App Store

To support limitless catalog expansion without bloating repository files, all plugins are indexed dynamically and queried through automated discovery endpoints:

### 1. Web App Store
Explore, search, and inspect plugins interactively on the official portal:
👉 **[https://plugins.floworkos.com](https://plugins.floworkos.com)**

### 2. Edge Gateway API
Real-time JSON search endpoint powered by Cloudflare Workers:
```powershell
# Query verified Windows plugins
curl.exe -s "https://plugins.floworkos.com/api/plugins?os=windows&q=chess"
```

### 3. Agent & CLI Discovery
Flowork AI agents search the catalog autonomously via semantic indexing:
```powershell
# Search registry via Flowork CLI
flowork plugin search "video editor"
```

---

## 🏛️ Architecture & Specs

```
FLOWAGENT-WINDOWS-PLUGIN/
├── index/                        # O(1) Crates.io-style sharded lookup metadata
│   └── <aa>/<bb>/<plugin_id>.json
├── plugins/                      # Sovereign plugin source roots
│   └── <aa>/<plugin_id>/
│       ├── plugin.manifest.json  # Plug & Play agnostic manifest
│       ├── SKILL.md              # 20-keyword Agent runbook & SOP
│       ├── gui/                  # HTML5 / Canvas frontend
│       └── engine/               # Node.js / WASM backend
├── categories/                   # Category grouping indexes
├── plugins.json                  # Root registry index
└── README.md
```

### Two-Tier Directory Sharding
To prevent Windows filesystem lookup degradation and ensure instant path resolution:
$$\text{Source Path} = \text{plugins}\backslash\{id[0..2]\}\backslash\{id\}$$
$$\text{Index Shard} = \text{index}\backslash\{id[0..2]\}\backslash\{id[2..4]\}\backslash\{id\}.\text{json}$$

### Windows Process & Port Model
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
flowork plugin install <plugin_id>
```

---

## 📋 Plugin Manifest Specification

Every plugin includes a mandatory `plugin.manifest.json`:

```json
{
  "id": "sample-plugin",
  "name": "Sample Plugin",
  "version": "1.0.0",
  "author": "Flowork OS & Community",
  "category": "Utilities",
  "icon": "⚡",
  "description": "High-performance sovereign extension with real-time IPC.",
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
# Place plugin in plugins/{id[:2]}/{id}
git add plugins/ index/ plugins.json
git commit -m "feat(plugin): publish <id> to Windows registry"
git push origin feature/win-plugin
```

---

## 📄 License & Sovereignty

Licensed under the **MIT License**. Built with sovereign pride by the Flowork OS Community.

Co-authored-by: Flowork OS <agent@floworkos.com>
