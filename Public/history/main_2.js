const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");
if (!gl) throw new Error("WebGL not supported");

canvas.width = 1280;
canvas.height = 720;

// Enable alpha blending for transparency
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

// === Shaders ===
const program = gl.createProgram();
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
gl.attachShader(program, vs);

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
gl.attachShader(program, fs);
gl.linkProgram(program);
gl.useProgram(program);

// === Quad Setup ===
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

// === Text Canvas ===
const textCanvas = document.createElement("canvas");
const ctx = textCanvas.getContext("2d");

function renderScorebug() {
  const w = (textCanvas.width = 640);
  const h = (textCanvas.height = 100);
  ctx.clearRect(0, 0, w, h);

  // Red left banner (really small)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(60, 0);
  ctx.lineTo(54, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = "#D32F2F";
  ctx.fill();

  // Blue right banner (really small)
  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(w - 60, 0);
  ctx.lineTo(w - 54, h);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = "#1976D2";
  ctx.fill();

  // Center black box
  ctx.fillStyle = "#333";
  ctx.fillRect((w - 120) / 2, 20, 120, 60);

  // Text styles
  ctx.fillStyle = "white";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Left team name
  ctx.fillText("TEAM A", 75, h / 2);

  // Right team name
  ctx.fillText("TEAM B", w - 75, h / 2);

  // Score text
  ctx.font = "bold 28px Arial";
  ctx.fillText("0 - 0", w / 2, h / 2);

  // League label
  ctx.font = "12px Arial";
  ctx.fillStyle = "#bbb";
  ctx.fillText("LEAGUE CUP", w / 2, 14);
}

// === Camera Setup ===
const video = document.getElementById("debugVideo");
navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
    video.play();
    video.onloadeddata = () => requestAnimationFrame(draw);
  })
  .catch((err) => alert("Camera access denied: " + err.message));

// === Draw Function ===
function draw() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);

  if (video.readyState >= 2) {
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  // Update overlay texture
  renderScorebug();
  gl.bindTexture(gl.TEXTURE_2D, overlayTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    textCanvas
  );

  const overlayWidth = 640;
  const overlayHeight = 100;
  const overlayX = (canvas.width - overlayWidth) / 2;
  const overlayY = canvas.height - overlayHeight - 20;

  gl.viewport(overlayX, overlayY, overlayWidth, overlayHeight);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gl.viewport(0, 0, canvas.width, canvas.height);
  requestAnimationFrame(draw);
}

let stream = canvas.captureStream(30);
let recorder;

try {
  recorder = new MediaRecorder(stream, {
    mimeType: "video/webm;codecs=h264",
  });
} catch (e) {
  alert("H.264 MediaRecorder not supported in this browser.");
}

const socket = new WebSocket("ws://localhost:8088");
recorder.ondataavailable = (e) => {
  if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
    socket.send(e.data);
  }
};
recorder.start(100);
