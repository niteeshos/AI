const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("overlay");
const canvasCtx = canvasElement.getContext("2d");
const gestureText = document.getElementById("gesture");
const modeText = document.getElementById("mode");

let activeMode = "idle";
let particles = [];
let time = 0;

const MODE_LABELS = {
  idle: "Idle",
  nebula: "Nebula",
  pulse: "Pulse",
  spark: "Spark",
  flow: "Flow",
};

function resizeCanvas() {
  canvasElement.width = videoElement.videoWidth || canvasElement.clientWidth;
  canvasElement.height = videoElement.videoHeight || canvasElement.clientHeight;
}

function fingerIsUp(landmarks, tipIndex, pipIndex) {
  return landmarks[tipIndex].y < landmarks[pipIndex].y;
}

function detectGesture(landmarks) {
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const indexUp = fingerIsUp(landmarks, 8, 6);
  const middleUp = fingerIsUp(landmarks, 12, 10);
  const ringUp = fingerIsUp(landmarks, 16, 14);
  const pinkyUp = fingerIsUp(landmarks, 20, 18);

  const upCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;
  const thumbUp = thumbTip.y < thumbIp.y;

  if (upCount === 4 && thumbUp) return { name: "Open palm", mode: "nebula" };
  if (upCount === 0 && !thumbUp) return { name: "Fist", mode: "pulse" };
  if (indexUp && middleUp && !ringUp && !pinkyUp) return { name: "Peace sign", mode: "spark" };
  if (thumbUp && !indexUp && !middleUp && !ringUp && !pinkyUp) {
    return { name: "Thumbs up", mode: "flow" };
  }
  return { name: "Unknown gesture", mode: "idle" };
}

function emitParticles(landmarks, mode) {
  const x = landmarks[8].x * canvasElement.width;
  const y = landmarks[8].y * canvasElement.height;
  const baseSpeed = mode === "pulse" ? 0.8 : 1.8;

  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * baseSpeed + 0.5;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      mode,
      size: Math.random() * 6 + 2,
    });
  }

  if (particles.length > 360) {
    particles = particles.slice(-300);
  }
}

function drawBackgroundFx(mode) {
  const { width, height } = canvasElement;
  if (mode === "nebula") {
    const grad = canvasCtx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      20,
      width * 0.5,
      height * 0.5,
      width * 0.7,
    );
    grad.addColorStop(0, "rgba(108, 42, 255, 0.22)");
    grad.addColorStop(1, "rgba(15, 11, 41, 0)");
    canvasCtx.fillStyle = grad;
    canvasCtx.fillRect(0, 0, width, height);
  }

  if (mode === "pulse") {
    const pulse = Math.abs(Math.sin(time * 0.12));
    canvasCtx.fillStyle = `rgba(255, 72, 140, ${0.08 + pulse * 0.2})`;
    canvasCtx.fillRect(0, 0, width, height);
  }

  if (mode === "flow") {
    for (let i = 0; i < 10; i++) {
      canvasCtx.strokeStyle = `rgba(70, 220, 255, ${0.06 + i * 0.012})`;
      canvasCtx.beginPath();
      canvasCtx.moveTo(0, (height / 10) * i + Math.sin(time * 0.05 + i) * 18);
      canvasCtx.bezierCurveTo(
        width * 0.3,
        (height / 10) * i + 22,
        width * 0.7,
        (height / 10) * i - 22,
        width,
        (height / 10) * i + Math.cos(time * 0.03 + i) * 16,
      );
      canvasCtx.stroke();
    }
  }
}

function particleColor(mode, life) {
  const alpha = Math.max(life, 0);
  switch (mode) {
    case "nebula":
      return `rgba(190, 110, 255, ${alpha})`;
    case "pulse":
      return `rgba(255, 120, 180, ${alpha})`;
    case "spark":
      return `rgba(255, 235, 120, ${alpha})`;
    case "flow":
      return `rgba(114, 236, 255, ${alpha})`;
    default:
      return `rgba(255,255,255,${alpha})`;
  }
}

function animateParticles() {
  particles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.012;
    p.vx *= 0.99;
    p.vy *= 0.99;
    canvasCtx.fillStyle = particleColor(p.mode, p.life);
    canvasCtx.beginPath();
    canvasCtx.arc(p.x, p.y, p.size * Math.max(p.life, 0.2), 0, Math.PI * 2);
    canvasCtx.fill();
  });
  particles = particles.filter((p) => p.life > 0);
}

function onResults(results) {
  if (videoElement.videoWidth && canvasElement.width !== videoElement.videoWidth) {
    resizeCanvas();
  }

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (results.multiHandLandmarks?.length) {
    const landmarks = results.multiHandLandmarks[0];
    const detected = detectGesture(landmarks);
    activeMode = detected.mode;

    gestureText.textContent = detected.name;
    modeText.textContent = MODE_LABELS[activeMode] ?? MODE_LABELS.idle;

    drawBackgroundFx(activeMode);
    emitParticles(landmarks, activeMode);

    drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
      color: "#7fb6ff",
      lineWidth: 3,
    });
    drawLandmarks(canvasCtx, landmarks, {
      color: "#d7e7ff",
      lineWidth: 1,
      radius: 4,
    });
  } else {
    activeMode = "idle";
    gestureText.textContent = "Looking for a hand…";
    modeText.textContent = MODE_LABELS.idle;
  }

  animateParticles();
  canvasCtx.restore();
  time += 1;
}

async function init() {
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.65,
    minTrackingConfidence: 0.6,
  });

  hands.onResults(onResults);

  const camera = new Camera(videoElement, {
    onFrame: async () => {
      await hands.send({ image: videoElement });
    },
    width: 1280,
    height: 720,
  });

  await camera.start();
  resizeCanvas();
}

init().catch((error) => {
  gestureText.textContent = "Camera error";
  modeText.textContent = "Unavailable";
  // eslint-disable-next-line no-console
  console.error(error);
});
