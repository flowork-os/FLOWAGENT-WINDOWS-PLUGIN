(function () {
  'use strict';

  // Dynamic Base API Resolver
  // If running inside X-Flow sandboxed iframe (/plugins/x-cutter/gui/),
  // requests to relative '/api/...' will hit Rust Host (19890) which returns 404.
  // We resolve the live engine port via host status or fallback.
  let API_BASE = '';

  async function resolveApiBase() {
    try {
      // 1. Try querying Rust Core supervisor for x-cutter assigned port
      const statusRes = await fetch('/api/plugins/x-cutter/status');
      if (statusRes.ok) {
        const info = await statusRes.json();
        if (info.port) {
          API_BASE = `http://127.0.0.1:${info.port}`;
          console.log('[X-Cutter GUI] Resolved Engine via Rust Host Supervisor:', API_BASE);
          return API_BASE;
        }
      }
    } catch (_) {}

    // 2. Direct origin check if served directly by node engine
    if (window.location.port && window.location.port !== '19890') {
      API_BASE = `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;
      return API_BASE;
    }

    // 3. Fallback default
    API_BASE = 'http://127.0.0.1:17898';
    return API_BASE;
  }

  // State Management
  const state = {
    filePath: null,
    probe: null,
    duration: 0,
    currentTime: 0,
    fps: 30,
    isPlaying: false,
    segments: [], // [{ id, start, end }]
    activeSegmentId: null,
    zoom: 1,
    isScrubbing: false
  };

  // DOM Elements
  const video = document.getElementById('video-player');
  const dropZone = document.getElementById('drop-zone');
  const fileInputNative = document.getElementById('file-input-native');
  const btnOpenFile = document.getElementById('btn-open-file');
  const btnExport = document.getElementById('btn-export');
  const btnAddSegment = document.getElementById('btn-add-segment');
  const btnClearSegments = document.getElementById('btn-clear-segments');

  const btnPlayPause = document.getElementById('btn-play-pause');
  const btnJumpStart = document.getElementById('btn-jump-start');
  const btnJumpEnd = document.getElementById('btn-jump-end');
  const btnFramePrev = document.getElementById('btn-frame-prev');
  const btnFrameNext = document.getElementById('btn-frame-next');
  const playbackSpeed = document.getElementById('playback-speed');
  const volSlider = document.getElementById('vol-slider');

  const btnSetIn = document.getElementById('btn-set-in');
  const btnSetOut = document.getElementById('btn-set-out');

  const osdCurrent = document.getElementById('osd-current');
  const osdDuration = document.getElementById('osd-duration');

  const metaFilename = document.getElementById('meta-filename');
  const metaRes = document.getElementById('meta-res');
  const metaCodec = document.getElementById('meta-codec');
  const metaFps = document.getElementById('meta-fps');
  const metaDur = document.getElementById('meta-dur');

  const segmentListEl = document.getElementById('segment-list');
  const segCountEl = document.getElementById('seg-count');

  const timelineContainer = document.getElementById('timeline-container');
  const timelineFilmstrip = document.getElementById('timeline-filmstrip');
  const timelineSegmentsLayer = document.getElementById('timeline-segments-layer');
  const playhead = document.getElementById('playhead');
  const zoomSlider = document.getElementById('zoom-slider');

  const modalExport = document.getElementById('modal-export');
  const modalTitle = document.getElementById('modal-title');
  const modalDesc = document.getElementById('modal-desc');
  const btnModalClose = document.getElementById('btn-modal-close');

  // Helpers
  function formatTime(s) {
    const sec = Math.max(0, Number(s) || 0);
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = (sec % 60).toFixed(3);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.padStart(6, '0')}`;
  }

  function getActiveSegment() {
    return state.segments.find(s => s.id === state.activeSegmentId) || state.segments[0];
  }

  // File Loading
  async function openVideoFile() {
    await resolveApiBase();
    try {
      const res = await fetch(`${API_BASE}/api/pick-file`);
      const text = await res.text();
      if (!text) {
        throw new Error('Empty response from engine picker');
      }
      const data = JSON.parse(text);
      if (data.cancelled) return;
      if (!data.success || !data.filePath) {
        throw new Error(data.error || 'No file selected');
      }

      loadVideo(data.filePath, data.probe);
    } catch (e) {
      console.warn('[X-Cutter] Native OS dialog error, falling back to browser picker:', e);
      // Fallback: trigger HTML file picker
      if (fileInputNative) {
        fileInputNative.click();
      } else {
        alert('Failed to select file: ' + e.message);
      }
    }
  }

  // Handle HTML File Input Fallback
  if (fileInputNative) {
    fileInputNative.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      await resolveApiBase();
      modalExport.classList.remove('hidden');
      modalTitle.innerText = 'Uploading Local Video...';
      modalDesc.innerText = `Preparing ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB) for editing...`;
      btnModalClose.classList.add('hidden');

      try {
        const uploadRes = await fetch(`${API_BASE}/api/upload-temp?name=${encodeURIComponent(file.name)}`, {
          method: 'POST',
          body: file
        });
        const uploadData = await uploadRes.json();
        modalExport.classList.add('hidden');

        if (uploadData.success && uploadData.filePath) {
          loadVideo(uploadData.filePath, uploadData.probe);
        } else {
          alert('Upload failed: ' + (uploadData.error || 'Unknown error'));
        }
      } catch (err) {
        modalExport.classList.add('hidden');
        alert('Upload failed: ' + err.message);
      }
    });
  }

  function loadVideo(filePath, probe) {
    state.filePath = filePath;
    state.probe = probe;

    // Extract metadata
    const videoStream = probe.streams?.find(s => s.codec_type === 'video') || {};
    state.duration = parseFloat(probe.format?.duration || videoStream.duration || 0);

    // Calculate FPS
    if (videoStream.r_frame_rate) {
      const [num, den] = videoStream.r_frame_rate.split('/');
      state.fps = den ? (parseInt(num, 10) / parseInt(den, 10)) : 30;
    } else {
      state.fps = 30;
    }

    // Populate Meta UI
    const filename = filePath.split(/[/\\]/).pop();
    metaFilename.innerText = filename;
    metaFilename.title = filePath;
    metaRes.innerText = `${videoStream.width || 0}x${videoStream.height || 0}`;
    metaCodec.innerText = `${videoStream.codec_name || 'unknown'}`.toUpperCase();
    metaFps.innerText = Math.round(state.fps) + ' fps';
    metaDur.innerText = formatTime(state.duration);

    // Setup Video Element Source via Engine Range Streamer
    video.src = `${API_BASE}/api/stream?file=${encodeURIComponent(filePath)}`;
    dropZone.classList.add('hidden');

    // Default Segment: entire video
    state.segments = [
      { id: 'seg_' + Date.now(), start: 0, end: state.duration }
    ];
    state.activeSegmentId = state.segments[0].id;

    renderSegments();
    renderTimeline();
    fetchThumbnails(filePath);
  }

  // Thumbnails Strip
  async function fetchThumbnails(filePath) {
    timelineFilmstrip.innerHTML = '<div style="padding:10px; color:#6b7280; font-size:11px;">Generating preview strip...</div>';
    try {
      const res = await fetch(`${API_BASE}/api/thumbnails?file=${encodeURIComponent(filePath)}&count=12`);
      const data = await res.json();
      if (data.success && data.thumbnails) {
        timelineFilmstrip.innerHTML = '';
        data.thumbnails.forEach(t => {
          const div = document.createElement('div');
          div.className = 'thumb-frame';
          div.style.backgroundImage = `url(${t.image})`;
          timelineFilmstrip.appendChild(div);
        });
      }
    } catch (_) {
      timelineFilmstrip.innerHTML = '';
    }
  }

  // Segment Management
  function renderSegments() {
    segCountEl.innerText = state.segments.length;
    segmentListEl.innerHTML = '';

    state.segments.forEach((seg, index) => {
      const item = document.createElement('div');
      item.className = `segment-item ${seg.id === state.activeSegmentId ? 'active' : ''}`;
      item.innerHTML = `
        <div style="display:flex; align-items:center;">
          <span class="seg-badge">#${index + 1}</span>
          <div class="seg-times">${formatTime(seg.start)} ➔ ${formatTime(seg.end)}</div>
        </div>
        <div>
          <button class="seg-del-btn" title="Delete segment">✕</button>
        </div>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.classList.contains('seg-del-btn')) {
          deleteSegment(seg.id);
        } else {
          state.activeSegmentId = seg.id;
          video.currentTime = seg.start;
          renderSegments();
          renderTimelineSegments();
        }
      });

      segmentListEl.appendChild(item);
    });

    renderTimelineSegments();
  }

  function addSegment() {
    const cur = video.currentTime;
    const dur = state.duration || 10;
    const newEnd = Math.min(dur, cur + 5);
    const newSeg = {
      id: 'seg_' + Date.now(),
      start: cur,
      end: newEnd
    };
    state.segments.push(newSeg);
    state.activeSegmentId = newSeg.id;
    renderSegments();
  }

  function deleteSegment(id) {
    if (state.segments.length <= 1) {
      alert('At least one cut segment must remain!');
      return;
    }
    state.segments = state.segments.filter(s => s.id !== id);
    if (state.activeSegmentId === id) {
      state.activeSegmentId = state.segments[0].id;
    }
    renderSegments();
  }

  function clearAllSegments() {
    state.segments = [{ id: 'seg_' + Date.now(), start: 0, end: state.duration }];
    state.activeSegmentId = state.segments[0].id;
    renderSegments();
  }

  // Mark In & Out
  function setMarkIn() {
    const active = getActiveSegment();
    if (!active) return;
    const now = video.currentTime;
    if (now >= active.end) {
      alert('Mark In cannot be greater than or equal to Mark Out!');
      return;
    }
    active.start = now;
    renderSegments();
  }

  function setMarkOut() {
    const active = getActiveSegment();
    if (!active) return;
    const now = video.currentTime;
    if (now <= active.start) {
      alert('Mark Out cannot be less than or equal to Mark In!');
      return;
    }
    active.end = now;
    renderSegments();
  }

  // Timeline Rendering
  function renderTimeline() {
    renderTimelineSegments();
    updatePlayhead();
  }

  function renderTimelineSegments() {
    timelineSegmentsLayer.innerHTML = '';
    const dur = state.duration || 1;

    state.segments.forEach((seg, idx) => {
      const leftPct = (seg.start / dur) * 100;
      const widthPct = ((seg.end - seg.start) / dur) * 100;

      const segBox = document.createElement('div');
      segBox.className = `timeline-segment-box ${seg.id === state.activeSegmentId ? 'active' : ''}`;
      segBox.style.left = `${leftPct}%`;
      segBox.style.width = `${widthPct}%`;

      segBox.innerHTML = `
        <div class="handle-left" title="Drag to adjust Start"></div>
        <span>#${idx + 1} (${(seg.end - seg.start).toFixed(2)}s)</span>
        <div class="handle-right" title="Drag to adjust End"></div>
      `;

      segBox.addEventListener('click', (e) => {
        e.stopPropagation();
        state.activeSegmentId = seg.id;
        renderSegments();
      });

      timelineSegmentsLayer.appendChild(segBox);
    });
  }

  function updatePlayhead() {
    const dur = state.duration || 1;
    const pct = (video.currentTime / dur) * 100;
    playhead.style.left = `${pct}%`;
    osdCurrent.innerText = formatTime(video.currentTime);
  }

  // Scrubbing on Timeline
  function seekToTimelineX(e) {
    const rect = timelineContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    video.currentTime = pct * (state.duration || 0);
    updatePlayhead();
  }

  timelineContainer.addEventListener('mousedown', (e) => {
    state.isScrubbing = true;
    seekToTimelineX(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (state.isScrubbing) {
      seekToTimelineX(e);
    }
  });

  window.addEventListener('mouseup', () => {
    state.isScrubbing = false;
  });

  // Video Event Listeners
  video.addEventListener('timeupdate', () => {
    updatePlayhead();
  });

  video.addEventListener('loadedmetadata', () => {
    osdDuration.innerText = formatTime(video.duration);
    if (!state.duration) state.duration = video.duration;
  });

  video.addEventListener('play', () => {
    state.isPlaying = true;
    btnPlayPause.innerText = '⏸';
  });

  video.addEventListener('pause', () => {
    state.isPlaying = false;
    btnPlayPause.innerText = '▶';
  });

  // Transport Controls
  function togglePlayPause() {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }

  function stepFrame(frames) {
    video.pause();
    const frameTime = 1 / state.fps;
    video.currentTime = Math.max(0, Math.min(state.duration, video.currentTime + (frames * frameTime)));
    updatePlayhead();
  }

  btnPlayPause.addEventListener('click', togglePlayPause);
  btnJumpStart.addEventListener('click', () => { video.currentTime = 0; });
  btnJumpEnd.addEventListener('click', () => { video.currentTime = state.duration; });
  btnFramePrev.addEventListener('click', () => stepFrame(-1));
  btnFrameNext.addEventListener('click', () => stepFrame(1));

  playbackSpeed.addEventListener('change', (e) => {
    video.playbackRate = parseFloat(e.target.value);
  });

  volSlider.addEventListener('input', (e) => {
    video.volume = parseFloat(e.target.value);
  });

  btnSetIn.addEventListener('click', setMarkIn);
  btnSetOut.addEventListener('click', setMarkOut);
  btnAddSegment.addEventListener('click', addSegment);
  btnClearSegments.addEventListener('click', clearAllSegments);
  btnOpenFile.addEventListener('click', openVideoFile);
  dropZone.addEventListener('click', openVideoFile);

  // Drag & Drop Support on Viewport
  viewportBoxDropSupport();

  function viewportBoxDropSupport() {
    const box = document.querySelector('.viewport-box');
    if (!box) return;

    box.addEventListener('dragover', (e) => {
      e.preventDefault();
      box.style.borderColor = '#3b82f6';
    });

    box.addEventListener('dragleave', (e) => {
      e.preventDefault();
      box.style.borderColor = 'transparent';
    });

    box.addEventListener('drop', async (e) => {
      e.preventDefault();
      box.style.borderColor = 'transparent';
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;

      await resolveApiBase();
      modalExport.classList.remove('hidden');
      modalTitle.innerText = 'Loading Dropped Video...';
      modalDesc.innerText = `Transferring ${file.name}...`;
      btnModalClose.classList.add('hidden');

      try {
        const uploadRes = await fetch(`${API_BASE}/api/upload-temp?name=${encodeURIComponent(file.name)}`, {
          method: 'POST',
          body: file
        });
        const uploadData = await uploadRes.json();
        modalExport.classList.add('hidden');

        if (uploadData.success && uploadData.filePath) {
          loadVideo(uploadData.filePath, uploadData.probe);
        } else {
          alert('Load failed: ' + (uploadData.error || 'Unknown error'));
        }
      } catch (err) {
        modalExport.classList.add('hidden');
        alert('Load failed: ' + err.message);
      }
    });
  }

  // Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayPause();
    } else if (e.code === 'KeyI') {
      setMarkIn();
    } else if (e.code === 'KeyO') {
      setMarkOut();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      stepFrame(-1);
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      stepFrame(1);
    } else if (e.code === 'KeyK') {
      togglePlayPause();
    } else if (e.code === 'KeyJ') {
      stepFrame(-5);
    } else if (e.code === 'KeyL') {
      stepFrame(5);
    }
  });

  // Export Cut
  btnExport.addEventListener('click', async () => {
    if (!state.filePath) {
      alert('Please load a video first!');
      return;
    }

    await resolveApiBase();
    const mode = document.querySelector('input[name="exportMode"]:checked')?.value || 'lossless';
    const originalName = state.filePath.split(/[/\\]/).pop().replace(/\.[^/.]+$/, "");
    const initialName = `${originalName}_cut.mp4`;

    try {
      const saveRes = await fetch(`${API_BASE}/api/pick-save?name=${encodeURIComponent(initialName)}`);
      const saveData = await saveRes.json();
      if (!saveData.success || !saveData.filePath) return;

      // Show Progress Modal
      modalExport.classList.remove('hidden');
      modalTitle.innerText = 'Cutting & Exporting Video...';
      modalDesc.innerText = `Mode: ${mode.toUpperCase()} | Writing to: ${saveData.filePath}`;
      btnModalClose.classList.add('hidden');

      const exportPayload = {
        sourcePath: state.filePath,
        outputPath: saveData.filePath,
        segments: state.segments.map(s => ({ start: s.start, end: s.end })),
        mode: mode,
        speed: parseFloat(playbackSpeed.value || '1.0')
      };

      const res = await fetch(`${API_BASE}/api/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportPayload)
      });

      const resData = await res.json();
      if (resData.success) {
        modalTitle.innerText = 'Export Completed Successfully! 🎉';
        modalDesc.innerText = `Saved file: ${resData.outputPath}`;
      } else {
        modalTitle.innerText = 'Export Failed ❌';
        modalDesc.innerText = `Error: ${resData.error}`;
      }
      btnModalClose.classList.remove('hidden');
    } catch (e) {
      modalTitle.innerText = 'Export Encountered An Error';
      modalDesc.innerText = e.message;
      btnModalClose.classList.remove('hidden');
    }
  });

  btnModalClose.addEventListener('click', () => {
    modalExport.classList.add('hidden');
  });

  // Auto-init resolver
  resolveApiBase();

})();
