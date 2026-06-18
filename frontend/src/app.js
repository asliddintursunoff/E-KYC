const state = {
  tempToken: "",
  accessToken: "",
  refreshToken: "",
  stream: null,
};

const elements = {
  loginForm: document.querySelector("#login-form"),
  passportId: document.querySelector("#passport-id"),
  password: document.querySelector("#password"),
  loginButton: document.querySelector("#login-button"),
  verifyView: document.querySelector("#verify-view"),
  profileView: document.querySelector("#profile-view"),
  message: document.querySelector("#message"),
  video: document.querySelector("#camera"),
  canvas: document.querySelector("#snapshot"),
  placeholder: document.querySelector("#camera-placeholder"),
  openCameraButton: document.querySelector("#open-camera-button"),
  captureButton: document.querySelector("#capture-button"),
  profileDetails: document.querySelector("#profile-details"),
  restartButton: document.querySelector("#restart-button"),
  steps: [...document.querySelectorAll(".step")],
};

function setBusy(button, isBusy, text) {
  button.disabled = isBusy;
  if (text) {
    button.dataset.defaultText ||= button.textContent;
    button.textContent = isBusy ? text : button.dataset.defaultText;
  }
}

function setMessage(text = "", type = "info") {
  elements.message.textContent = text;
  elements.message.className = `message ${text ? "is-visible" : ""} ${type}`;
}

function showStep(step) {
  elements.loginForm.classList.toggle("is-hidden", step !== "login");
  elements.verifyView.classList.toggle("is-hidden", step !== "face");
  elements.profileView.classList.toggle("is-hidden", step !== "profile");

  elements.steps.forEach((item) => {
    item.classList.toggle("is-active", item.dataset.step === step);
    item.classList.toggle(
      "is-complete",
      (step === "face" && item.dataset.step === "login") ||
        (step === "profile" && item.dataset.step !== "profile"),
    );
  });
}

async function readApiError(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await response.json();
    if (body.detail) return body.detail;
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

async function login(event) {
  event.preventDefault();
  setMessage("");
  setBusy(elements.loginButton, true, "Checking...");

  try {
    const data = await apiFetch("/api/users/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        passport_id: elements.passportId.value.trim(),
        password: elements.password.value,
      }),
    });

    state.tempToken = data.temporary_login_token;
    if (!state.tempToken) {
      throw new Error("Backend did not return a temporary login token.");
    }

    showStep("face");
    setMessage("Login accepted. Open the camera to verify your face.", "success");
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    setBusy(elements.loginButton, false, "Checking...");
  }
}

async function openCamera() {
  setMessage("");
  stopCamera();

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
    elements.captureButton.disabled = false;
    await elements.video.play();
  } catch (error) {
    setMessage(`Camera could not be opened. ${error.message}`, "error");
    elements.captureButton.disabled = true;
    elements.placeholder.classList.remove("is-hidden");
  }
}

function stopCamera() {
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
    state.stream = null;
  }
  elements.video.srcObject = null;
}

function captureImageBlob() {
  const video = elements.video;
  const canvas = elements.canvas;
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) {
    throw new Error("Camera is not ready yet. Please try again.");
  }

  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(video, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Could not capture a photo from the camera."));
      },
      "image/jpeg",
      0.92,
    );
  });
}

async function verifyFace() {
  setMessage("");
  setBusy(elements.captureButton, true, "Verifying...");

  try {
    const imageBlob = await captureImageBlob();
    const formData = new FormData();
    formData.append("image", imageBlob, "face-capture.jpg");

    const tokenData = await apiFetch("/api/users/verify/", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${state.tempToken}`,
      },
      body: formData,
    });

    state.accessToken = tokenData.access_token;
    state.refreshToken = tokenData.refresh_token;
    if (!state.accessToken) {
      throw new Error("Backend did not return an access token.");
    }

    stopCamera();
    await loadMyInfo();
  } catch (error) {
    stopCamera();
    elements.placeholder.classList.remove("is-hidden");
    setMessage(`${error.message} Open the camera again?`, "error");
  } finally {
    setBusy(elements.captureButton, false, "Verifying...");
    elements.captureButton.disabled = !state.stream;
  }
}

async function loadMyInfo() {
  const user = await apiFetch("/api/users/me/", {
    headers: {
      Authorization: `Bearer ${state.accessToken}`,
    },
  });

  renderProfile(user);
  showStep("profile");
  setMessage("Face ID verified successfully.", "success");
}

function renderProfile(user) {
  const fields = [
    ["First name", user.first_name],
    ["Last name", user.last_name],
    ["Middle name", user.middle_name],
    ["Passport ID", user.passport_id],
    ["Date of birth", user.date_of_birth],
    ["User ID", user.id],
  ];

  elements.profileDetails.innerHTML = fields
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([label, value]) => `
        <div class="profile-row">
          <dt>${escapeHtml(label)}</dt>
          <dd>${escapeHtml(String(value))}</dd>
        </div>
      `,
    )
    .join("");
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
  stopCamera();
  state.tempToken = "";
  state.accessToken = "";
  state.refreshToken = "";
  elements.password.value = "";
  elements.captureButton.disabled = true;
  elements.placeholder.classList.remove("is-hidden");
  showStep("login");
  setMessage("");
}

elements.loginForm.addEventListener("submit", login);
elements.openCameraButton.addEventListener("click", openCamera);
elements.captureButton.addEventListener("click", verifyFace);
elements.restartButton.addEventListener("click", restart);
window.addEventListener("beforeunload", stopCamera);

if (!navigator.mediaDevices?.getUserMedia) {
  elements.openCameraButton.disabled = true;
  setMessage("This browser does not support camera capture.", "error");
}
