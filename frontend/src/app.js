const API = {
  register: "/api/users/register/",
  login: "/api/users/login/",
  registerSelfie: "/api/users/register/selfie/",
  verifySelfie: "/api/users/verify/selfie/",
  me: "/api/users/me/",
  job: (jobId) => `/api/users/job/${jobId}/`,
};

const state = {
  tempToken: "",
  accessToken: "",
  refreshToken: "",
  stream: null,
  pollTimer: null,
  scanFrame: 0,
  detector: null,
  mode: "login",
  accountFlow: "login",
  isUploading: false,
  autoCaptured: false,
  stableFrames: 0,
  livenessStep: 0,
  livenessStableFrames: 0,
};

const views = {
  auth: document.querySelector("#auth-view"),
  camera: document.querySelector("#camera-view"),
  processing: document.querySelector("#processing-view"),
  profile: document.querySelector("#profile-view"),
};

const elements = {
  loginForm: document.querySelector("#login-form"),
  registerForm: document.querySelector("#register-form"),
  loginButton: document.querySelector("#login-button"),
  registerButton: document.querySelector("#register-button"),
  tabs: [...document.querySelectorAll(".tab-button")],
  progressSteps: [...document.querySelectorAll(".progress-step")],
  message: document.querySelector("#message"),
  video: document.querySelector("#camera"),
  canvas: document.querySelector("#snapshot"),
  overlay: document.querySelector("#face-overlay"),
  placeholder: document.querySelector("#camera-placeholder"),
  openCameraButton: document.querySelector("#open-camera-button"),
  captureButton: document.querySelector("#capture-button"),
  captureStatus: document.querySelector("#capture-status"),
  qualityItems: {
    face: document.querySelector("[data-quality='face']"),
    fit: document.querySelector("[data-quality='fit']"),
    sharp: document.querySelector("[data-quality='sharp']"),
    light: document.querySelector("[data-quality='light']"),
    pose: document.querySelector("[data-quality='pose']"),
  },
  jobStatus: document.querySelector("#job-status"),
  jobId: document.querySelector("#job-id"),
  profileCard: document.querySelector("#profile-card"),
  verifiedPill: document.querySelector("#verified-pill"),
  restartButton: document.querySelector("#restart-button"),
};

const livenessSteps = [
  {
    prompt: "Look straight at the camera.",
    match: (offset) => Math.abs(offset) < 0.12,
  },
  {
    prompt: "Turn or lean your head slightly left.",
    match: (offset) => offset < -0.12,
  },
  {
    prompt: "Turn or lean your head slightly right.",
    match: (offset) => offset > 0.12,
  },
  {
    prompt: "Face forward again and hold still.",
    match: (offset) => Math.abs(offset) < 0.12,
  },
];

function setBusy(button, isBusy, busyText) {
  button.disabled = isBusy;
  if (busyText) {
    button.dataset.defaultText ||= button.textContent;
    button.textContent = isBusy ? busyText : button.dataset.defaultText;
  }
}

function setMessage(text = "", type = "info") {
  elements.message.textContent = text;
  elements.message.className = `message ${text ? "is-visible" : ""} ${type}`;
}

function showView(activeView) {
  Object.entries(views).forEach(([name, view]) => {
    view.classList.toggle("is-hidden", name !== activeView);
  });

  const order = ["auth", "camera", "processing", "profile"];
  const activeIndex = order.indexOf(activeView);
  elements.progressSteps.forEach((step) => {
    const stepIndex = order.indexOf(step.dataset.step);
    step.classList.toggle("is-active", step.dataset.step === activeView);
    step.classList.toggle("is-complete", stepIndex !== -1 && stepIndex < activeIndex);
  });
}

function setMode(mode) {
  state.mode = mode;
  elements.loginForm.classList.toggle("is-hidden", mode !== "login");
  elements.registerForm.classList.toggle("is-hidden", mode !== "register");
  elements.tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.mode === mode);
  });
  setMessage("");
}

async function readApiError(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await response.json();
    if (body.detail) return body.detail;
    if (body.error) return body.error;
    return Object.entries(body)
      .map(([field, value]) => `${field}: ${Array.isArray(value) ? value.join(", ") : value}`)
      .join("\n");
  }
  return response.text();
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error((await readApiError(response)) || `Request failed with ${response.status}`);
  }
  return response.json();
}

function formJson(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  if (data.passport_id) data.passport_id = data.passport_id.toUpperCase();
  return data;
}

async function login(event) {
  event.preventDefault();
  setMessage("");
  setBusy(elements.loginButton, true, "Checking...");

  try {
    const data = await apiFetch(API.login, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formJson(elements.loginForm)),
    });

    state.tempToken = data.temporary_login_token;
    if (!state.tempToken) throw new Error("Backend did not return a temporary login token.");
    state.accountFlow = "login";
    beginCamera("Login accepted. The camera will capture automatically when your face is clear.");
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    setBusy(elements.loginButton, false, "Checking...");
  }
}

async function register(event) {
  event.preventDefault();
  setMessage("");
  setBusy(elements.registerButton, true, "Creating...");

  try {
    const data = await apiFetch(API.register, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formJson(elements.registerForm)),
    });

    state.tempToken = data.selfie_verification_token;
    if (!state.tempToken) throw new Error("Backend did not return a selfie verification token.");
    state.accountFlow = "register";
    beginCamera("Account created. The camera will register your face automatically.");
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    setBusy(elements.registerButton, false, "Creating...");
  }
}

function beginCamera(message) {
  resetCaptureState();
  showView("camera");
  setMessage(message, "success");
}

async function openCamera() {
  setMessage("");
  stopCamera();
  resetCaptureState();

  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });

    elements.video.srcObject = state.stream;
    elements.placeholder.classList.add("is-hidden");
    elements.captureButton.disabled = true;
    await elements.video.play();
    initFaceDetector();
    startFaceScan();
  } catch (error) {
    elements.captureButton.disabled = true;
    elements.placeholder.classList.remove("is-hidden");
    setMessage(`Camera could not be opened. ${error.message}`, "error");
  }
}

function initFaceDetector() {
  if ("FaceDetector" in window && !state.detector) {
    state.detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
  }
}

function stopCamera() {
  cancelAnimationFrame(state.scanFrame);
  state.scanFrame = 0;
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
  elements.video.srcObject = null;
  drawOverlay();
}

function resetCaptureState() {
  state.autoCaptured = false;
  state.stableFrames = 0;
  state.livenessStep = 0;
  state.livenessStableFrames = 0;
  elements.captureStatus.textContent = "Open the camera and place your face inside the guide.";
  setQuality("face", false);
  setQuality("fit", false);
  setQuality("sharp", false);
  setQuality("light", false);
  setQuality("pose", false);
  drawOverlay();
}

function startFaceScan() {
  const tick = async () => {
    if (!state.stream || state.isUploading) return;
    await scanCameraFrame();
    state.scanFrame = requestAnimationFrame(tick);
  };
  state.scanFrame = requestAnimationFrame(tick);
}

async function scanCameraFrame() {
  if (!elements.video.videoWidth || !elements.video.videoHeight) return;

  const quality = sampleFrameQuality();
  const face = await detectFace();
  const guide = getGuideBox(elements.video.videoWidth, elements.video.videoHeight);
  const fit = face ? isFaceInsideGuide(face, guide) : false;
  const livenessReady = updateLivenessChallenge(face, fit, guide);
  const ready = Boolean(face && fit && quality.isSharp && quality.hasGoodLight && livenessReady);

  setQuality("face", Boolean(face));
  setQuality("fit", fit);
  setQuality("sharp", quality.isSharp);
  setQuality("light", quality.hasGoodLight);
  setQuality("pose", livenessReady);

  if (!state.detector) {
    elements.captureStatus.textContent =
      "Face detector is not available in this browser. Align your face in the guide, keep the image sharp, then use capture.";
    elements.captureButton.disabled = !(quality.isSharp && quality.hasGoodLight);
    drawOverlay({ guide });
    return;
  }

  drawOverlay({ guide, face, ready });
  elements.captureButton.disabled = !ready;

  if (ready) {
    state.stableFrames += 1;
    elements.captureStatus.textContent = "Hold still. Capturing automatically...";
  } else {
    state.stableFrames = 0;
    elements.captureStatus.textContent = getInstruction(face, fit, quality);
  }

  if (state.stableFrames >= 18 && !state.autoCaptured) {
    state.autoCaptured = true;
    await submitSelfie();
  }
}

async function detectFace() {
  if (!state.detector) return null;
  try {
    const faces = await state.detector.detect(elements.video);
    if (!faces.length) return null;
    return faces[0].boundingBox;
  } catch {
    state.detector = null;
    return null;
  }
}

function sampleFrameQuality() {
  const sample = document.createElement("canvas");
  const width = 160;
  const height = 120;
  sample.width = width;
  sample.height = height;
  const context = sample.getContext("2d", { willReadFrequently: true });
  context.drawImage(elements.video, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const gray = new Uint8ClampedArray(width * height);
  let brightness = 0;

  for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
    const value = Math.round(pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
    gray[p] = value;
    brightness += value;
  }

  brightness /= gray.length;
  let laplacianTotal = 0;
  let laplacianSqTotal = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const idx = y * width + x;
      const laplacian =
        gray[idx - width] + gray[idx - 1] + gray[idx + 1] + gray[idx + width] - 4 * gray[idx];
      laplacianTotal += laplacian;
      laplacianSqTotal += laplacian * laplacian;
      count += 1;
    }
  }

  const mean = laplacianTotal / count;
  const variance = laplacianSqTotal / count - mean * mean;

  return {
    isSharp: variance > 70,
    hasGoodLight: brightness > 55 && brightness < 215,
  };
}

function getGuideBox(width, height) {
  const guideWidth = width * 0.42;
  const guideHeight = height * 0.58;
  return {
    x: (width - guideWidth) / 2,
    y: height * 0.18,
    width: guideWidth,
    height: guideHeight,
  };
}

function isFaceInsideGuide(face, guide) {
  const faceCenterX = face.x + face.width / 2;
  const faceCenterY = face.y + face.height / 2;
  const guideCenterX = guide.x + guide.width / 2;
  const guideCenterY = guide.y + guide.height / 2;
  const minFaceWidth = guide.width * 0.48;
  const maxFaceWidth = guide.width * 1.08;
  const normalizedX = (faceCenterX - guideCenterX) / (guide.width / 2);
  const normalizedY = (faceCenterY - guideCenterY) / (guide.height / 2);
  const centerInsideOval = normalizedX * normalizedX + normalizedY * normalizedY <= 0.78;

  return centerInsideOval && face.width >= minFaceWidth && face.width <= maxFaceWidth;
}

function updateLivenessChallenge(face, fit, guide) {
  if (!face || !fit) {
    state.livenessStableFrames = 0;
    return false;
  }

  const faceCenterX = face.x + face.width / 2;
  const guideCenterX = guide.x + guide.width / 2;
  const offset = (faceCenterX - guideCenterX) / guide.width;
  const step = livenessSteps[state.livenessStep];

  if (step.match(offset)) {
    state.livenessStableFrames += 1;
  } else {
    state.livenessStableFrames = 0;
  }

  if (state.livenessStableFrames >= 10 && state.livenessStep < livenessSteps.length - 1) {
    state.livenessStep += 1;
    state.livenessStableFrames = 0;
    return false;
  }

  return state.livenessStep === livenessSteps.length - 1 && step.match(offset);
}

function getInstruction(face, fit, quality) {
  if (!face) return "Move your face into view.";
  if (!fit) return "Move closer or center your face inside the frame.";
  if (!quality.hasGoodLight) return "Find even lighting on your face.";
  if (!quality.isSharp) return "Hold the phone steady so the photo is not blurry.";
  return livenessSteps[state.livenessStep].prompt;
}

function setQuality(key, isReady) {
  const item = elements.qualityItems[key];
  if (!item) return;
  item.classList.toggle("is-ready", isReady);
}

function drawOverlay({ guide, face, ready } = {}) {
  const canvas = elements.overlay;
  const rect = elements.video.getBoundingClientRect();
  canvas.width = rect.width || 1;
  canvas.height = rect.height || 1;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (!guide && elements.video.videoWidth && elements.video.videoHeight) {
    guide = getGuideBox(elements.video.videoWidth, elements.video.videoHeight);
  }
  if (!guide || !elements.video.videoWidth) return;

  const scaleX = canvas.width / elements.video.videoWidth;
  const scaleY = canvas.height / elements.video.videoHeight;
  const g = scaleBox(guide, scaleX, scaleY);

  drawFaceGuide(context, g, Boolean(face), ready);
}

function drawFaceGuide(context, guide, hasFace, ready) {
  const centerX = guide.x + guide.width / 2;
  const centerY = guide.y + guide.height / 2;
  const radiusX = guide.width / 2;
  const radiusY = guide.height / 2;
  const color = ready ? "#44c27f" : hasFace ? "#f6b44b" : "#ffffff";

  context.save();
  context.lineWidth = 4;
  context.strokeStyle = color;
  context.shadowColor = "rgba(0, 0, 0, 0.3)";
  context.shadowBlur = 8;
  context.beginPath();
  context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  context.stroke();

  context.shadowBlur = 0;
  context.lineWidth = 5;
  context.lineCap = "round";
  drawGuideTick(context, centerX, guide.y, 0, -18);
  drawGuideTick(context, centerX, guide.y + guide.height, 0, 18);
  drawGuideTick(context, guide.x, centerY, -18, 0);
  drawGuideTick(context, guide.x + guide.width, centerY, 18, 0);
  context.restore();
}

function drawGuideTick(context, x, y, offsetX, offsetY) {
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + offsetX, y + offsetY);
  context.stroke();
}

function scaleBox(box, scaleX, scaleY) {
  return {
    x: box.x * scaleX,
    y: box.y * scaleY,
    width: box.width * scaleX,
    height: box.height * scaleY,
  };
}

function captureImageBlob() {
  const width = elements.video.videoWidth;
  const height = elements.video.videoHeight;
  if (!width || !height) throw new Error("Camera is not ready yet. Please try again.");

  elements.canvas.width = width;
  elements.canvas.height = height;
  const context = elements.canvas.getContext("2d");
  context.drawImage(elements.video, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    elements.canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not capture a photo from the camera."));
      },
      "image/jpeg",
      0.92,
    );
  });
}

async function submitSelfie() {
  if (state.isUploading) return;
  state.isUploading = true;
  setMessage("");
  setBusy(elements.captureButton, true, "Uploading...");

  try {
    const imageBlob = await captureImageBlob();
    const formData = new FormData();
    formData.append("image", imageBlob, "camera-capture.jpg");

    const url = state.accountFlow === "register" ? API.registerSelfie : API.verifySelfie;
    const data = await apiFetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${state.tempToken}`,
      },
      body: formData,
    });

    stopCamera();
    elements.placeholder.classList.remove("is-hidden");

    if (data.job_id) {
      showView("processing");
      elements.jobId.textContent = `Job ID: ${data.job_id}`;
      elements.jobStatus.textContent = "Face registration started. Waiting for SUCCESS.";
      await pollJob(data.job_id);
      return;
    }

    await finishWithTokens(data);
  } catch (error) {
    state.autoCaptured = false;
    state.stableFrames = 0;
    stopCamera();
    elements.placeholder.classList.remove("is-hidden");
    elements.captureButton.disabled = true;
    setMessage(`${error.message} Open the camera again?`, "error");
  } finally {
    state.isUploading = false;
    setBusy(elements.captureButton, false, "Uploading...");
    elements.captureButton.disabled = !state.stream;
  }
}

async function pollJob(jobId) {
  clearPoll();
  let attempts = 0;
  const maxAttempts = 60;

  const tick = async () => {
    attempts += 1;
    try {
      const data = await apiFetch(API.job(jobId), {
        headers: {
          Authorization: `Bearer ${state.tempToken}`,
        },
      });

      elements.jobStatus.textContent = `Status: ${data.status}`;

      if (data.status === "SUCCESS") {
        clearPoll();
        await finishWithTokens(data);
        return;
      }

      if (data.status === "FAILURE" || data.error) {
        clearPoll();
        showView("camera");
        setMessage(data.error || "Face registration failed. Open the camera again?", "error");
        return;
      }

      if (attempts >= maxAttempts) {
        clearPoll();
        showView("camera");
        setMessage("Verification is taking too long. Open the camera and try again.", "error");
      }
    } catch (error) {
      clearPoll();
      showView("camera");
      setMessage(`${error.message} Open the camera again?`, "error");
    }
  };

  elements.jobStatus.textContent = "Status: PENDING";
  await tick();
  if (!state.accessToken) {
    state.pollTimer = window.setInterval(tick, 2000);
  }
}

function clearPoll() {
  if (state.pollTimer) {
    window.clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
}

async function finishWithTokens(data) {
  state.accessToken = data.access_token;
  state.refreshToken = data.refresh_token;
  if (!state.accessToken || !state.refreshToken) {
    throw new Error("Backend did not return access and refresh tokens yet.");
  }
  await loadMyInfo();
}

async function loadMyInfo() {
  const user = await apiFetch(API.me, {
    headers: {
      Authorization: `Bearer ${state.accessToken}`,
    },
  });

  renderProfile(user);
  showView("profile");
  setMessage("Face verification completed successfully.", "success");
}

function renderProfile(user) {
  const imageUrl = normalizeMediaUrl(user.image);
  const fields = [
    ["First name", user.first_name],
    ["Last name", user.last_name],
    ["Middle name", user.middle_name],
    ["Passport ID", user.passport_id],
    ["Date of birth", user.date_of_birth],
    ["User ID", user.id],
  ];

  elements.verifiedPill.textContent = user.verified ? "Verified" : "Not verified";
  elements.verifiedPill.classList.toggle("is-warning", !user.verified);

  elements.profileCard.innerHTML = `
    ${
      imageUrl
        ? `<div class="profile-photo">
            <img src="${escapeHtml(imageUrl)}" alt="Verified user face" />
          </div>`
        : `<div class="profile-photo profile-photo-empty">No image returned</div>`
    }
    <div class="profile-fields">
      ${fields
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(
          ([label, value]) => `
            <div class="profile-field">
              <span>${escapeHtml(label)}</span>
              <strong>${escapeHtml(String(value))}</strong>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function normalizeMediaUrl(value) {
  if (!value) return "";
  if (value.startsWith("/media/")) return value;
  try {
    const url = new URL(value);
    if (url.pathname.startsWith("/media/")) return `${url.pathname}${url.search}`;
  } catch {
    return value;
  }
  return value;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function restart() {
  clearPoll();
  stopCamera();
  state.tempToken = "";
  state.accessToken = "";
  state.refreshToken = "";
  state.accountFlow = "login";
  elements.loginForm.reset();
  elements.registerForm.reset();
  elements.captureButton.disabled = true;
  elements.placeholder.classList.remove("is-hidden");
  elements.jobStatus.textContent = "Waiting for backend response";
  elements.jobId.textContent = "";
  resetCaptureState();
  showView("auth");
  setMessage("");
}

elements.tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
elements.loginForm.addEventListener("submit", login);
elements.registerForm.addEventListener("submit", register);
elements.openCameraButton.addEventListener("click", openCamera);
elements.captureButton.addEventListener("click", submitSelfie);
elements.restartButton.addEventListener("click", restart);
window.addEventListener("resize", () => drawOverlay());
window.addEventListener("beforeunload", () => {
  clearPoll();
  stopCamera();
});

if (!navigator.mediaDevices?.getUserMedia) {
  elements.openCameraButton.disabled = true;
  setMessage("This browser does not support camera capture.", "error");
}
