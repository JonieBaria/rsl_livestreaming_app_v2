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
    // Input from pipe (webm with audio+video)
    "-f",
    "webm",
    "-i",
    "pipe:0",

    // Video encoding
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast", // lower latency
    "-tune",
    "zerolatency", // no buffering
    "-pix_fmt",
    "yuv420p",
    "-r",
    "30", // target fps
    "-g",
    "30", // GOP size = 1s @30fps
    "-b:v",
    "2500k",
    "-maxrate",
    "2500k",
    "-bufsize",
    "500k", // smaller buffer = lower latency

    // Audio encoding (from browser)
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    "44100",

    // Output to Facebook RTMP
    "-f",
    "flv",
    "rtmp://live-api-s.facebook.com:443/rtmp/FB-665053932562556-0-Ab1eyRCvkkMP4LJ3Wd6xIHiq", // ← Replace with real stream key
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
