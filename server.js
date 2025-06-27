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
    "-re",
    "-f",
    "webm",
    "-r",
    "30",
    "-i",
    "pipe:0",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-tune",
    "zerolatency",
    "-pix_fmt",
    "yuv420p",
    "-b:v",
    "2000k",
    "-bufsize",
    "1000k",
    "-g",
    "30",
    "-r",
    "30",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    "44100",
    "-f",
    "flv",
    "rtmps://live-api-s.facebook.com:443/rtmp/FB-665053932562556-0-Ab1eyRCvkkMP4LJ3Wd6xIHiq",
  ]);

  ffmpeg.stderr.on("data", (data) => console.log("FFmpeg:", data.toString()));
  ffmpeg.on("close", (code) =>
    console.log("FFmpeg process exited with code", code)
  );

  // 🟢 === Add buffer queue for 20s delay ===
  const BUFFER_DELAY_MS = 20000; // 20 seconds
  const bufferQueue = [];

  // 🟢 Periodically release buffered chunks after delay
  const bufferInterval = setInterval(() => {
    const now = Date.now();
    while (
      bufferQueue.length > 0 &&
      now - bufferQueue[0].ts >= BUFFER_DELAY_MS
    ) {
      const chunk = bufferQueue.shift();
      ffmpeg.stdin.write(chunk.data);
    }
  }, 10);

  ws.on("message", (msg) => {
    // 🟢 Instead of writing directly, store chunk with timestamp
    bufferQueue.push({ ts: Date.now(), data: msg });
  });

  ws.on("close", () => {
    console.log("🔌 WebSocket disconnected");
    clearInterval(bufferInterval); // 🟢 stop buffer timer
    ffmpeg.stdin.end();
    ffmpeg.kill("SIGINT");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
