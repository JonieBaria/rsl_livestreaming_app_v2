const express = require("express");
const { WebSocketServer } = require("ws");
const { spawn } = require("child_process");
const http = require("http");

const app = express();
app.use(express.static("public")); // serve frontend

const server = http.createServer(app); // ✅ No HTTPS — Render handles SSL

// ✅ Attach WebSocket to the same server — don't use `port`
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("📡 WebSocket client connected");

  const ffmpeg = spawn("ffmpeg", [
    "-re",
    "-f",
    "webm",
    "-i",
    "pipe:0",

    // Dummy audio
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=44100",

    // Video encoding
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-tune",
    "zerolatency",
    "-pix_fmt",
    "yuv420p",
    "-b:v",
    "2500k",
    "-bufsize",
    "5000k",
    "-g",
    "60",
    "-r",
    "30",

    // Audio
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    "44100",

    // Output
    "-f",
    "flv",
    "rtmps://live-api-s.facebook.com:443/rtmp/FB-xxxxx", // ← Replace with real stream key
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
