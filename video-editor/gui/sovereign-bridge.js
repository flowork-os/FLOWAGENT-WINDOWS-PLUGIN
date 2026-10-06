// [FLOWORKOS:NANO-PLUG] - sovereign-bridge.js
// Module: SovereignVideoStudioBridge (Flowork OS Canvas & Agent IPC Adapter)
// Doctrine: Local-First, Zero Cloud Dependency, Bi-Directional Agent Control Loop

(function () {
  console.log('[Sovereign Video Studio] Initializing Flowork OS Sovereign Bridge...');

  const eventListeners = new Map();
  const PROJECTS_KEY = 'flowork:video-studio:projects';
  const BUNDLES_KEY = 'flowork:video-studio:bundles';
  const CONFIGS_KEY = 'flowork:video-studio:configs';

  // Seed sovereign user session to permanently bypass cloud login
  const sovereignUser = {
    id: 'usr_awenkaudico',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'awenkforex@gmail.com',
    email_confirmed_at: '2024-01-01T00:00:00.000Z',
    app_metadata: { provider: 'flowork' },
    user_metadata: { full_name: 'Awenk Audico', name: 'Awenk Audico', first_name: 'Awenk', last_name: 'Audico' },
    identities: [{ provider: 'flowork' }]
  };
  const sovereignSession = {
    access_token: 'sovereign_token',
    token_type: 'bearer',
    expires_in: 315360000,
    expires_at: 253370764800,
    refresh_token: 'sovereign_refresh',
    user: sovereignUser
  };
  try {
    localStorage.setItem('sb-mpvhvyxuqfcemfnwiaiq-auth-token', JSON.stringify(sovereignSession));
    localStorage.setItem('diffusion-studio:user', JSON.stringify(sovereignUser));
    if (!localStorage.getItem('kb-color-mode')) {
      localStorage.setItem('kb-color-mode', 'dark');
    }
  } catch (_) {}

  function getStoredProjects() {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}

    const defaultProjects = [
      {
        dir: '/workspace/videos/welcome',
        id: 'proj_flowork_welcome',
        name: 'welcome',
        displayName: 'Flowork Studio Welcome',
        createdAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
        cover: null
      }
    ];
    saveStoredProjects(defaultProjects);
    return defaultProjects;
  }

  function saveStoredProjects(list) {
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  function getStoredBundle(dir) {
    try {
      const raw = localStorage.getItem(BUNDLES_KEY + ':' + dir);
      if (raw) return raw;
    } catch (_) {}

    // Default clean sovereign composition
    return `
const { createComponent, Scene, Text, Rect, Group } = require("@diffusionstudio/jsx");

exports.default = function Project() {
  return createComponent(Scene, {
    children: [
      createComponent(Rect, {
        fill: "#090d16",
        width: 1920,
        height: 1080
      }),
      createComponent(Text, {
        text: "Diffusion Video Studio",
        fontSize: 72,
        fill: "#38bdf8",
        x: 480,
        y: 420
      }),
      createComponent(Text, {
        text: "Flowork OS Sovereign Multi-Track Video Timeline",
        fontSize: 32,
        fill: "#94a3b8",
        x: 490,
        y: 520
      })
    ]
  });
};
`;
  }

  function saveStoredBundle(dir, code) {
    try {
      localStorage.setItem(BUNDLES_KEY + ':' + dir, code);
    } catch (_) {}
  }

  const handlers = {
    // ── 1. Window & UI System ──
    'window:is-fullscreen': async () => false,
    'window:set-color-mode': async () => ({ ok: true }),
    'window:set-busy': async () => ({ ok: true }),
    'window:show': async () => ({ ok: true }),
    'window:capture': async () => ({ ok: true }),
    'analytics:track': async () => ({ ok: true }),
    'auth:get-pending-callback': async () => null,
    'auth:callback': async () => ({ ok: true }),
    'auth:session': async () => sovereignSession,
    'auth:get-user': async () => sovereignUser,
    'checkout:get-pending-callback': async () => null,
    
    // ── 2. Project Hierarchy & Paths ──
    'projects:default-root': async () => '/workspace/videos',
    'projects:pick-root': async () => '/workspace/videos',
    'projects:pick-folder': async () => '/workspace/videos',
    
    'projects:scan': async ({ root } = {}) => {
      const list = getStoredProjects();
      return list;
    },
    
    'projects:get': async ({ dir } = {}) => {
      const list = getStoredProjects();
      return list.find(p => p.dir === dir) || list[0] || null;
    },
    
    'projects:resolve': async ({ dir } = {}) => {
      const list = getStoredProjects();
      const found = list.find(p => p.dir === dir);
      if (found) {
        found.lastOpenedAt = new Date().toISOString();
        saveStoredProjects(list);
        return found;
      }
      // Auto-resolve new dir
      const name = (dir || '/workspace/videos/untitled').split(/[\\/]/).pop() || 'untitled';
      const created = {
        dir: dir || '/workspace/videos/' + name,
        id: 'proj_' + Math.random().toString(36).slice(2, 8),
        name: name,
        displayName: name,
        createdAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
        cover: null
      };
      list.unshift(created);
      saveStoredProjects(list);
      return created;
    },

    'projects:init': async ({ dir } = {}) => {
      const list = getStoredProjects();
      let p = list.find(item => item.dir === dir);
      if (!p) {
        const name = (dir || '/workspace/videos/untitled').split(/[\\/]/).pop() || 'untitled';
        p = {
          dir: dir || '/workspace/videos/' + name,
          id: 'proj_' + Math.random().toString(36).slice(2, 8),
          name: name,
          displayName: name,
          createdAt: new Date().toISOString(),
          lastOpenedAt: new Date().toISOString(),
          cover: null
        };
        list.unshift(p);
        saveStoredProjects(list);
      }
      return p;
    },
    
    'projects:create': async ({ root, displayName } = {}) => {
      const list = getStoredProjects();
      const cleanName = (displayName || 'Untitled Project').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const baseRoot = root || '/workspace/videos';
      const newProj = {
        dir: baseRoot + '/' + cleanName,
        id: 'proj_' + Math.random().toString(36).slice(2, 8),
        name: cleanName,
        displayName: displayName || 'Untitled Project',
        createdAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
        cover: null
      };
      list.unshift(newProj);
      saveStoredProjects(list);
      return newProj;
    },
    
    'projects:rename': async ({ dir, displayName } = {}) => {
      const list = getStoredProjects();
      const p = list.find(item => item.dir === dir);
      if (p) {
        p.displayName = displayName;
        saveStoredProjects(list);
      }
      return { ok: true };
    },

    'projects:duplicate': async ({ dir } = {}) => {
      const list = getStoredProjects();
      const orig = list.find(item => item.dir === dir);
      if (!orig) return null;
      const dup = {
        ...orig,
        dir: orig.dir + '-copy',
        id: 'proj_' + Math.random().toString(36).slice(2, 8),
        name: orig.name + '-copy',
        displayName: orig.displayName + ' (Copy)',
        createdAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString()
      };
      list.unshift(dup);
      saveStoredProjects(list);
      return dup;
    },

    'projects:delete': async ({ dir } = {}) => {
      let list = getStoredProjects();
      list = list.filter(p => p.dir !== dir);
      saveStoredProjects(list);
      return { ok: true };
    },

    // ── 3. Project Manifest & Config ──
    'projects:manifest-read': async ({ dir } = {}) => ({
      name: (dir || 'flowork-project').split('/').pop() || 'flowork-project',
      version: '1.0.0',
      description: 'Flowork Sovereign Video Composition',
      author: 'Flowork OS & Diffusion Studio'
    }),

    'projects:manifest-write': async () => ({ ok: true }),

    'projects:config-read': async ({ dir } = {}) => {
      try {
        const raw = localStorage.getItem(CONFIGS_KEY + ':' + dir);
        if (raw) return JSON.parse(raw);
      } catch (_) {}
      return {
        width: 1920,
        height: 1080,
        fps: 30,
        duration: 15
      };
    },

    'projects:config-write': async ({ dir, config } = {}) => {
      try {
        localStorage.setItem(CONFIGS_KEY + ':' + dir, JSON.stringify(config));
      } catch (_) {}
      return { ok: true };
    },

    // ── 4. Project Compiler & Live Code Pipeline ──
    'projects:compile': async ({ dir } = {}) => {
      const code = getStoredBundle(dir);
      return {
        ok: true,
        code: code,
        diagnostics: []
      };
    },

    'projects:write': async ({ dir, edits } = {}) => {
      console.log('[Sovereign Video Studio] Saving timeline edits for:', dir, edits);
      return { ok: true };
    },

    'projects:watch': async () => ({ ok: true }),
    'projects:unwatch': async () => ({ ok: true }),

    // ── 5. Virtual File System & Local Assets ──
    'projects:fs-list': async () => [],
    'projects:fs-stat': async () => ({ isDirectory: false, size: 0, mtime: Date.now() }),
    'projects:fs-real-path': async (p) => p,
    'projects:fs-remove': async () => ({ ok: true }),

    'file:transfer': async () => ({ ok: true }),
    'file:write-open': async () => ({ id: 'w_' + Date.now() }),
    'file:write-chunk': async () => ({ ok: true }),
    'file:write-close': async () => ({ ok: true }),
    'file:write-abort': async () => ({ ok: true }),

    // ── 6. Agent, MCP & CLI Bridges ──
    'agent-chat:endpoint': async () => `${window.location.protocol}//${window.location.hostname}:9099`,
    
    'mcp:status': async () => ({
      connected: true,
      agentsCount: 1,
      sovereignCore: 'flowork-os',
      mcpVersion: '2024-11-05'
    }),
    
    'mcp:apply': async () => ({ ok: true }),

    'cli:status': async () => ({
      installed: true,
      version: '2.16.0'
    }),

    'cli:install': async () => ({ ok: true }),
    'cli:uninstall': async () => ({ ok: true }),

    'logs:get': async () => []
  };

  // Sovereign Desktop Shim
  window.desktop = {
    platform: navigator.platform.toLowerCase().includes('win') ? 'win32' : 'linux',
    isFloworkSovereign: true,
    
    on: (channel, callback) => {
      if (!eventListeners.has(channel)) {
        eventListeners.set(channel, new Set());
      }
      eventListeners.get(channel).add(callback);
    },
    
    off: (channel, callback) => {
      if (eventListeners.has(channel)) {
        eventListeners.get(channel).delete(callback);
      }
    },
    
    send: (channel, payload) => {
      if (channel === 'main:request') {
        const { id, channel: reqChannel, data } = payload || {};
        const fn = handlers[reqChannel];
        if (typeof fn === 'function') {
          Promise.resolve(fn(data))
            .then(res => {
              dispatchWireResponse(id, true, res);
            })
            .catch(err => {
              console.warn('[Sovereign Video Studio] Error in handler ' + reqChannel + ':', err);
              dispatchWireResponse(id, false, null, err.message);
            });
        } else {
          console.log('[Sovereign Video Studio] Default fallback for channel:', reqChannel);
          dispatchWireResponse(id, true, {});
        }
      }
    }
  };

  function dispatchWireResponse(id, ok, data, error) {
    const listeners = eventListeners.get('main:response');
    if (listeners) {
      listeners.forEach(cb => {
        try {
          cb({ id, ok, data, error });
        } catch (_) {}
      });
    }
  }

  // Cross-Window PostMessage Adapter (Flowork Canvas <-> Video Studio)
  window.addEventListener('message', (event) => {
    if (!event.data || typeof event.data !== 'object') return;
    const { type, action, payload } = event.data;
    
    if (type === 'FLOWORK_STUDIO_ACTION') {
      console.log('[Sovereign Video Studio] Host action received:', action, payload);
      window.dispatchEvent(new CustomEvent('flowork:studio:' + action, { detail: payload }));
    }
  });

  // Notify parent window when editor is mounted
  window.addEventListener('DOMContentLoaded', () => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'FLOWORK_PLUGIN_READY',
        pluginId: 'video-editor',
        capabilities: ['timeline_edit', 'webcodecs_render', 'native_ffmpeg_export']
      }, '*');
    }
  });

  console.log('[Sovereign Video Studio] Sovereign Bridge Ready & Active.');

  // Sovereign Mr. Flow Action Dispatcher
  window.FloworkStudio = {
    action: function (name, data) {
      console.log("[Mr. Flow AI Video Engine] Action triggered:", name, data);
      
      // Visual feedback / toast
      try {
        const toastEl = document.createElement("div");
        toastEl.className = "flowork-ai-toast";
        toastEl.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:999999;background:#18181b;color:#10b981;border:1px solid #27272a;padding:12px 18px;border-radius:8px;font-family:sans-serif;font-size:13px;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,0.5);display:flex;align-items:center;gap:10px;animation:fadeIn 0.2s ease-in-out;";
        toastEl.innerHTML = `<span>⚡</span><span>[Mr. Flow AI]: Action <b>${name.toUpperCase()}</b> executing...</span>`;
        document.body.appendChild(toastEl);
        setTimeout(() => { toastEl.remove(); }, 3200);
      } catch (_) {}

      // Dispatch to internal plugin events & parent iframe
      window.dispatchEvent(new CustomEvent("flowork:ai_action", { detail: { action: name, data: data || {} } }));
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: "FLOWORK_STUDIO_AGENT_ACTION",
          pluginId: "video-editor",
          action: name,
          payload: data || {}
        }, "*");
      }
    }
  };

})();
