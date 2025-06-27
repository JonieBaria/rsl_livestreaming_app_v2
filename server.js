const express = require("express");
const { WebSocketServer } = require("ws");
const { spawn } = require("child_process");
const http = require("http");

const app = express();
app.use(express.static("Public")); // serve frontend

const server = http.createServer(app); // ✅ No HTTPS — Render handles SSL

// ✅ Attach WebSocket to the same server — don't use `port`
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("📡 WebSocket client connected");

  const ffmpeg = spawn("ffmpeg", [
    "-re", // Pace input in real time; prevents sending too fast
    "-f",
    "webm", // Input format: WebM (from browser MediaRecorder)
    "-r",
    "30", // Interpret input as 30 FPS (MUST split: "-r", "30")
    "-i",
    "pipe:0", // Read input from stdin (your NodeJS pipe)

    // Dummy audio source (if your browser stream has no audio)
    "-f",
    "lavfi", // Filter as input
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=44100",

    // Video encoding options
    "-c:v",
    "libx264", // Encode video with H.264
    "-preset",
    "ultrafast", // Fastest compression; least CPU-intensive
    "-tune",
    "zerolatency", // Reduce latency for live streaming
    "-pix_fmt",
    "yuv420p", // Pixel format needed for compatibility with players like Facebook
    "-b:v",
    "800k", // Target video bitrate 2.5 Mbps (adjust if bandwidth is lower)
    "-bufsize",
    "500k", // Buffer size for rate control; smoothens bitrate spikes
    "-g",
    "30", // GOP size: keyframe every 1 second at 30 FPS
    "-r",
    "30", // Output framerate fixed at 30 FPS

    // Audio encoding options
    "-c:a",
    "aac", // Encode audio with AAC (FB requires AAC)
    "-b:a",
    "128k", // Audio bitrate
    "-ar",
    "44100", // Audio sample rate

    // Output
    "-f",
    "flv", // Output format: FLV (required for RTMP)
    "rtmps://live-api-s.facebook.com:443/rtmp/FB-665053932562556-0-Ab1eyRCvkkMP4LJ3Wd6xIHiq", // Replace with your actual stream key
  ]);

  ffmpeg.stderr.on("data", (data) => {
    console.log("FFmpeg:", data.toString());
  });

  ffmpeg.on("close", (code) => {
    console.log("FFmpeg process exited with code", code);
  });

  ws.on("message", (msg) => {
    ffmpeg.stdin.write(msg);
  });

  ws.on("close", () => {
    console.log("🔌 WebSocket disconnected");
    ffmpeg.stdin.end();
    ffmpeg.kill("SIGINT");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
