const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");
if (!gl) throw new Error("WebGL not supported");

canvas.width = 1280;
canvas.height = 720;

// Enable transparency
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// === Shaders ===
const vs = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(
  vs,
  `
  attribute vec3 position;
  attribute vec2 texCoord;
  varying vec2 vTexCoord;
  void main() {
    gl_Position = vec4(position, 1.0);
    vTexCoord = texCoord;
  }
`
);
gl.compileShader(vs);

const fs = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(
  fs,
  `
  precision mediump float;
  uniform sampler2D tex;
  varying vec2 vTexCoord;
  void main() {
    gl_FragColor = texture2D(tex, vTexCoord);
  }
`
);
gl.compileShader(fs);

const program = gl.createProgram();
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);
gl.useProgram(program);

// === Quad Geometry ===
const vertexData = new Float32Array([
  -1, -1, 0, 0, 0, 1, -1, 0, 1, 0, -1, 1, 0, 0, 1, 1, 1, 0, 1, 1,
]);
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

const posLoc = gl.getAttribLocation(program, "position");
const texLoc = gl.getAttribLocation(program, "texCoord");
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 20, 0);
gl.enableVertexAttribArray(texLoc);
gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 20, 12);

// === Textures ===
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
const videoTexture = gl.createTexture();
const overlayTexture = gl.createTexture();
function setupTexture(tex) {
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
setupTexture(videoTexture);
setupTexture(overlayTexture);

const logoImage = new Image();
logoImage.src = "RSL.png"; // or your real logo path

// === Canvas overlay for text & scorebug ===
const textCanvas = document.createElement("canvas");
const ctx = textCanvas.getContext("2d");

let leftScore = 0;
let rightScore = 0;

function addScore(side, points) {
  if (side === "left") leftScore += points;
  else if (side === "right") rightScore += points;
}

// === Overlay Rendering ===
function renderOverlay() {
  const leftName = document.getElementById("leftTeamName").value;
  const rightName = document.getElementById("rightTeamName").value;
  const w = (textCanvas.width = 700);
  const h = 60;
  const leagueBarHeight = 24;
  const logoSize = 40; // size of the logo
  const totalHeight = h + leagueBarHeight + logoSize + 8; // extra margin below logo

  textCanvas.height = totalHeight;
  ctx.clearRect(0, 0, w, totalHeight);

  // Shadow for scorebug
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  // Rounded rectangle background
  const radius = 12;
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(w - radius, 0);
  ctx.quadraticCurveTo(w, 0, w, radius);
  ctx.lineTo(w, h - radius);
  ctx.quadraticCurveTo(w, h, w - radius, h);
  ctx.lineTo(radius, h);
  ctx.quadraticCurveTo(0, h, 0, h - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  // Red left panel
  let redGradient = ctx.createLinearGradient(0, 0, 200, 0);
  redGradient.addColorStop(0, "#FF5252");
  redGradient.addColorStop(1, "#D32F2F");
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(300, 0);
  ctx.lineTo(270, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = redGradient;
  ctx.fill();

  // Blue right panel
  let blueGradient = ctx.createLinearGradient(w - 200, 0, w, 0);
  blueGradient.addColorStop(0, "#1976D2");
  blueGradient.addColorStop(1, "#64B5F6");
  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(w - 300, 0);
  ctx.lineTo(w - 270, h);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = blueGradient;
  ctx.fill();

  // Center box for score
  const centerW = 150;
  ctx.fillStyle = "#111";
  ctx.fillRect((w - centerW) / 2, 0, centerW, h);

  // Team Names
  ctx.fillStyle = "#fff";
  ctx.font = "bold 30px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(leftName, 130, h / 2);
  ctx.fillText(rightName, w - 130, h / 2);

  // Score
  ctx.font = "bold 36px Arial";
  ctx.fillText(`${leftScore} - ${rightScore}`, w / 2, h / 2);

  // League bar
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, h, w, leagueBarHeight);

  // League text
  ctx.fillStyle = "#bbb";
  ctx.font = "900 15px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("RIZAL SPORTS LEAGUE", w / 2, h + leagueBarHeight / 2);

  // Draw logo below league bar on bottom-left
  if (logoImage.complete) {
    ctx.shadowBlur = 4; // subtle logo shadow
    ctx.drawImage(logoImage, 10, h + leagueBarHeight + 4, logoSize, logoSize);
  }
}

// === Camera Video Setup ===
const video = document.getElementById("debugVideo");
navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
    video.play();
    video.onloadeddata = () => requestAnimationFrame(draw);
  })
  .catch((err) => alert("Camera access denied: " + err.message));

// === WebGL Draw Loop ===
function draw() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);

  if (video.readyState >= 2) {
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  renderOverlay();
  gl.bindTexture(gl.TEXTURE_2D, overlayTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    textCanvas
  );

  const overlayW = textCanvas.width;
  const overlayH = textCanvas.height;
  const overlayX = (canvas.width - overlayW) / 2;
  const overlayY = canvas.height * 0.03;

  gl.viewport(overlayX, overlayY, overlayW, overlayH);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gl.viewport(0, 0, canvas.width, canvas.height);
  requestAnimationFrame(draw);
}

// // === Recorder Setup (Optional) ===
let stream = canvas.captureStream(30);
let recorder;
try {
  recorder = new MediaRecorder(stream, {
    mimeType: "video/webm;codecs=vp8",
  });
} catch (e) {
  alert("H.264 MediaRecorder not supported.");
}
const socket = new WebSocket("wss://rsl-livestream-lwkk.onrender.com");
recorder.ondataavailable = (e) => {
  if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
    socket.send(e.data);
  }
};
recorder.start(100);
