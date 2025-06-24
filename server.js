const fs = require("fs");
const https = require("https");
const express = require("express");
const WebSocket = require("ws");
const { spawn } = require("child_process");
const ffmpegPath = "ffmpeg";

const app = express();
app.use(express.static("public"));

const sslOptions = {
  key: fs.readFileSync("cert/key.pem"),
  cert: fs.readFileSync("cert/cert.pem"),
};

const httpsServer = https.createServer(sslOptions, app);

httpsServer.listen(3000, () => {
  console.log("🔒 HTTPS server running at https://localhost:3000");
});

// 🧩 Add WebSocket server for FFmpeg piping (on port 8080 or reuse HTTPS server)
const port = process.env.PORT || 8080;
const wss = new WebSocket.Server("https://rsl-livestream-lwkk.onrender.com");
console.log(`📡 WebSocket server running on port ${port}`);

wss.on("connection", function connection(ws) {
  console.log("📡 WebSocket client connected");

  const ffmpeg = spawn(ffmpegPath, [
    "-re", // real-time input pacing
    "-f",
    "webm", // or use rawvideo/yuv4mpegpipe if you're piping raw frames
    "-i",
    "pipe:0", // read from stdin

    // Dummy audio input
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
    "60", // keyframe every 2s for 30fps
    "-r",
    "30",

    // Audio encoding
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    "-ar",
    "44100",

    // Output
    "-f",
    "flv",
    "rtmps://live-api-s.facebook.com:443/rtmp/FB-665053932562556-0-Ab1eyRCvkkMP4LJ3Wd6xIHiq", // use rtmp:// for Facebook Live
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
