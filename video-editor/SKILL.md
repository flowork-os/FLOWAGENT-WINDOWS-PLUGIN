# 🎬 Diffusion Video Studio — Sovereign Agent Runbook (SKILL.md)

<!-- [KEYWORDS: video_editor, diffusion_studio, timeline, clips, ffmpeg, render, webcodecs, subtitles, trim, cut] -->

## 1. Plugin Overview & Identity
- **Plugin ID**: `video-editor`
- **Name**: Diffusion Video Studio
- **Stack**: SolidJS, WebCodecs API, HTML5 Canvas, WebGL, TypeGPU, Local Native FFmpeg
- **Runtime Model**: 100% Local-First Sovereign Canvas Plugin (Zero Cloud Dependency)
- **Role for Mr. Flow**: Autonomous Video Assistant & Timeline Synthesizer

---

## 2. Agent Collaboration Loop
Mr. Flow collaborates with the user in three primary modes:
1. **Interactive Canvas Assistant**: User designs visuals in Canvas; Mr. Flow analyzes transcripts, cuts B-roll, or syncs audio tracks programmatically.
2. **Headless Timeline Automation**: User requests automated video generation (e.g., *"Cut 60s shorts from podcast.mp4 with subtitles and background music"*).
3. **High-Precision Production Rendering**: Dispatches offline native FFmpeg jobs with GPU acceleration (Exit Code 0).

---

## 3. Timeline Composition Schema (JSON Contract)

When manipulating projects or generating timeline files, use the standard Flowork Timeline Format:

```json
{
  "version": "1.0.0",
  "meta": {
    "title": "Project Name",
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "duration": 60.0
  },
  "tracks": [
    {
      "id": "track_video_main",
      "type": "video",
      "clips": [
        {
          "id": "clip_01",
          "source": "assets/clip1.mp4",
          "start": 0.0,
          "duration": 15.0,
          "inPoint": 2.5,
          "outPoint": 17.5,
          "transform": {
            "scale": 1.0,
            "position": [0, 0],
            "opacity": 1.0
          }
        }
      ]
    },
    {
      "id": "track_audio_bgm",
      "type": "audio",
      "clips": [
        {
          "id": "clip_bgm_01",
          "source": "assets/music.mp3",
          "start": 0.0,
          "duration": 60.0,
          "volume": 0.25,
          "fadeIn": 2.0,
          "fadeOut": 2.0
        }
      ]
    },
    {
      "id": "track_text_captions",
      "type": "text",
      "clips": [
        {
          "id": "cap_01",
          "text": "Welcome to Flowork Sovereign Studio",
          "start": 1.0,
          "duration": 4.0,
          "style": {
            "fontFamily": "Inter",
            "fontSize": 48,
            "color": "#ffffff",
            "position": [960, 900]
          }
        }
      ]
    }
  ]
}
```

---

## 4. Native FFmpeg Export Automation Pipeline

For fast, high-quality production exports without memory constraints, Mr. Flow executes local FFmpeg via `flow_exec`:

### Standard Cut & Trim:
```bash
ffmpeg -y -ss <IN_POINT> -i "<INPUT_VIDEO>" -t <DURATION> -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 192k "<OUTPUT_VIDEO>"
```

### Concatenate Clips:
```bash
# Create concat list in .flowork_spam/concat.txt
ffmpeg -y -f concat -safe 0 -i .flowork_spam/concat.txt -c copy "<OUTPUT_VIDEO>"
```

### Overlay Subtitles (.srt / .ass):
```bash
ffmpeg -y -i "<INPUT_VIDEO>" -vf "subtitles=<SUBTITLE_FILE>:force_style='Fontsize=24,PrimaryColour=&H00FFFFFF&'" -c:a copy "<OUTPUT_VIDEO>"
```

### Audio Mixdown (BGM + Voiceover):
```bash
ffmpeg -y -i "<VIDEO>" -i "<BGM>" -filter_complex "[0:a]volume=1.0[a1];[1:a]volume=0.25[a2];[a1][a2]amix=inputs=2:duration=first" -c:v copy -c:a aac "<OUTPUT_VIDEO>"
```

---

## 5. Local Backend Engine (`server.js`)
The plugin includes an optional local HTTP backend for asset streaming and background rendering:
- **Port**: `5174` (or allocated dynamic port)
- **Endpoints**:
  - `GET /api/status`: Returns system health and FFmpeg version.
  - `POST /api/timeline/export`: Triggers native FFmpeg render queue with progress telemetry.
  - `GET /api/projects`: Lists local timeline projects stored in workspace.
