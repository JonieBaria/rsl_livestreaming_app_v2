const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");
if (!gl) throw new Error("WebGL not supported");

canvas.width = 1280;
canvas.height = 720;

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

const logoCanvas = document.createElement("canvas");
logoCanvas.width = 70;
logoCanvas.height = 70;
const logoCtx = logoCanvas.getContext("2d");

const logoTexture = gl.createTexture();
setupTexture(logoTexture);

// === Logo and Canvas ===
const textCanvas = document.createElement("canvas");
const ctx = textCanvas.getContext("2d");

let leftScore = 0;
let rightScore = 0;

function addScore(side, points) {
  if (side === "left") {
    leftScore += points;
  } else if (side === "right") {
    rightScore += points;
  }
}

const logoImage = new Image();
logoImage.src = "RSL.png"; // Change to your logo path

function renderOverlay() {
  const leftName = document.getElementById("leftTeamName").value;
  const rightName = document.getElementById("rightTeamName").value;
  const w = (textCanvas.width = 700);
  const h = (textCanvas.height = 60);
  ctx.clearRect(0, 0, w, h);

  // Shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 6;

  let redGradient = ctx.createLinearGradient(0, 0, 180, 0);
  redGradient.addColorStop(0, "#FF5252");
  redGradient.addColorStop(1, "#D32F2F");
  ctx.beginPath();
  ctx.moveTo(0, 0); // top-left corner
  ctx.lineTo(320, 0); // top-right corner of red panel
  ctx.lineTo(290, h); // slanted bottom-right edge (closer to center)
  ctx.lineTo(0, h); // bottom-left corner
  ctx.closePath();
  ctx.fillStyle = redGradient;
  ctx.fill();

  // Right Panel (Blue) — slant on the left edge
  let blueGradient = ctx.createLinearGradient(w - 180, 0, w, 0);
  blueGradient.addColorStop(0, "#1976D2");
  blueGradient.addColorStop(1, "#64B5F6");
  ctx.beginPath();
  ctx.moveTo(w, 0); // top-right corner
  ctx.lineTo(w - 320, 0); // top-left corner of blue panel
  ctx.lineTo(w - 290, h); // slanted bottom-left edge (closer to center)
  ctx.lineTo(w, h); // bottom-right corner
  ctx.closePath();
  ctx.fillStyle = blueGradient;
  ctx.fill();

  // Center Box
  ctx.fillStyle = "#333";
  ctx.fillRect((w - 140) / 2, 10, 140, 50);

  // Text
  ctx.fillStyle = "#fff";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(leftName, 120, h / 2);
  ctx.fillText(rightName, w - 120, h / 2);

  ctx.font = "bold 30px Arial";
  ctx.fillText(`${leftScore} - ${rightScore}`, w / 2, h / 2);

  ctx.shadowColor = "#444";
  ctx.shadowBlur = 2;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.font = "900 15px Arial";
  ctx.fillStyle = "#bbb";
  ctx.fillText("RSL", w / 2, h - 10);

  //   // Draw Logo (Bottom-left)
  //   const logoSize = 50;
  //   if (logoImage.complete) {
  //     ctx.drawImage(logoImage, 10, h - logoSize - 5, logoSize, logoSize);
  //   }
}

function renderLogo() {
  logoCtx.clearRect(0, 0, logoCanvas.width, logoCanvas.height);

  const logoSize = 70;
  if (logoImage.complete) {
    logoCtx.drawImage(
      logoImage,
      0,
      logoCanvas.height - logoSize,
      logoSize,
      logoSize
    );
  }
}

// === Camera Setup ===
const constraints = {
  video: {
    facingMode: { exact: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30, max: 60 },
  },
  audio: true,
};

const video = document.getElementById("debugVideo");
navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
    video.play();
    video.onloadeddata = () => {
      if (logoImage.complete) {
        requestAnimationFrame(draw);
      } else {
        logoImage.onload = () => requestAnimationFrame(draw);
      }
    };
  })
  .catch((err) => alert("Camera access denied: " + err.message));

// === Render Loop ===
function draw() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);

  if (video.readyState >= 2) {
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  renderOverlay();
  renderLogo();
  gl.bindTexture(gl.TEXTURE_2D, logoTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    logoCanvas
  );

  // Set viewport to bottom-left corner
  const logoW = logoCanvas.width;
  const logoH = logoCanvas.height;
  const margin = 30;
  gl.viewport(
    canvas.width - logoW - margin, // x position from right
    canvas.height - logoH - margin, // y position from top (WebGL origin is bottom-left)
    logoW,
    logoH
  );
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

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
