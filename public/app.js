const state = {
  preview: "",
};

const ui = {
  refreshButton: document.getElementById("refreshButton"),
  connectionBadge: document.getElementById("connectionBadge"),
  gameNameValue: document.getElementById("gameNameValue"),
  tagLineValue: document.getElementById("tagLineValue"),
  friendsValue: document.getElementById("friendsValue"),
  availabilityValue: document.getElementById("availabilityValue"),
  statusMessagePreview: document.getElementById("statusMessagePreview"),
  lockfileHint: document.getElementById("lockfileHint"),
  statusInput: document.getElementById("statusInput"),
  previewOutput: document.getElementById("previewOutput"),
  applyButton: document.getElementById("applyButton"),
  previewButton: document.getElementById("previewButton"),
  copyPreviewButton: document.getElementById("copyPreviewButton"),
  presetButtons: Array.from(document.querySelectorAll("[data-preset]")),
  imageInput: document.getElementById("imageInput"),
  asciiWidth: document.getElementById("asciiWidth"),
  asciiWidthValue: document.getElementById("asciiWidthValue"),
  convertImageButton: document.getElementById("convertImageButton"),
  useAsciiButton: document.getElementById("useAsciiButton"),
  asciiOutput: document.getElementById("asciiOutput"),
};

const ASCII_CHARS = " .'`^\",:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

async function loadSummary() {
  setBadge("Checking...", true);

  try {
    const response = await fetch("/api/league/summary");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not load League data.");
    }

    ui.gameNameValue.textContent = data.summoner.gameName || "-";
    ui.tagLineValue.textContent = data.summoner.tagLine ? `#${data.summoner.tagLine}` : "-";
    ui.friendsValue.textContent = `${data.friends.total} total / ${data.friends.online} online`;
    ui.availabilityValue.textContent = data.chat.availability || "-";
    ui.statusMessagePreview.textContent =
      data.chat.statusMessage || "No custom status found on your League profile.";
    ui.lockfileHint.textContent = `Lockfile: ${data.lockfile}`;
    ui.statusInput.value = data.chat.statusMessage || ui.statusInput.value;
    setBadge("Connected", false);
  } catch (error) {
    ui.gameNameValue.textContent = "-";
    ui.tagLineValue.textContent = "-";
    ui.friendsValue.textContent = "-";
    ui.availabilityValue.textContent = "-";
    ui.statusMessagePreview.textContent = error.message;
    ui.lockfileHint.textContent =
      "Tip: start the League client first or set LEAGUE_LOCKFILE if your install path is custom.";
    setBadge("Offline", true);
  }
}

async function applyStatus() {
  const statusMessage = ui.statusInput.value;
  ui.applyButton.disabled = true;
  ui.applyButton.textContent = "Applying...";

  try {
    const response = await fetch("/api/league/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusMessage }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to apply status.");
    }

    ui.statusMessagePreview.textContent = data.statusMessage || "Status cleared.";
    await loadSummary();
  } catch (error) {
    ui.statusMessagePreview.textContent = error.message;
  } finally {
    ui.applyButton.disabled = false;
    ui.applyButton.textContent = "Apply Status";
  }
}

async function buildPreview() {
  const response = await fetch("/api/text/fullwidth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: ui.statusInput.value }),
  });
  const data = await response.json();
  state.preview = data.preview || "";
  ui.previewOutput.value = state.preview;
}

async function copyPreview() {
  const value = ui.previewOutput.value || state.preview || "";

  if (!value) {
    return;
  }

  await navigator.clipboard.writeText(value);
  ui.copyPreviewButton.textContent = "Copied";
  window.setTimeout(() => {
    ui.copyPreviewButton.textContent = "Copy Preview";
  }, 1200);
}

function setBadge(text, muted) {
  ui.connectionBadge.textContent = text;
  ui.connectionBadge.className = muted ? "badge badge-muted" : "badge";
}

async function convertImageToAscii() {
  const file = ui.imageInput.files?.[0];

  if (!file) {
    ui.asciiOutput.value = "Choose an image first.";
    return;
  }

  ui.convertImageButton.disabled = true;
  ui.convertImageButton.textContent = "Converting...";

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(dataUrl);
    const width = Number(ui.asciiWidth.value);
    const ascii = imageToAscii(image, width);
    ui.asciiOutput.value = ascii;
  } catch (error) {
    ui.asciiOutput.value = error.message || "Failed to convert image.";
  } finally {
    ui.convertImageButton.disabled = false;
    ui.convertImageButton.textContent = "Convert Image";
  }
}

function useAsciiInStatus() {
  if (!ui.asciiOutput.value) {
    return;
  }

  ui.statusInput.value = ui.asciiOutput.value;
}

function updateAsciiWidthLabel() {
  ui.asciiWidthValue.textContent = `${ui.asciiWidth.value} characters wide`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read the image file."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load the uploaded image."));
    image.src = src;
  });
}

function imageToAscii(image, targetWidth) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const aspect = image.height / image.width;
  const targetHeight = Math.max(1, Math.round(targetWidth * aspect * 0.55));

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const { data } = context.getImageData(0, 0, targetWidth, targetHeight);
  const lines = [];

  for (let y = 0; y < targetHeight; y += 1) {
    let line = "";

    for (let x = 0; x < targetWidth; x += 1) {
      const index = (y * targetWidth + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const alpha = data[index + 3] / 255;
      const brightness = ((0.299 * r + 0.587 * g + 0.114 * b) * alpha) / 255;
      const charIndex = Math.max(
        0,
        Math.min(ASCII_CHARS.length - 1, Math.round((1 - brightness) * (ASCII_CHARS.length - 1))),
      );

      line += ASCII_CHARS[charIndex];
    }

    lines.push(rtrimAscii(line));
  }

  return lines.join("\n").trim();
}

function rtrimAscii(text) {
  return text.replace(/\s+$/g, "");
}

ui.refreshButton.addEventListener("click", loadSummary);
ui.applyButton.addEventListener("click", applyStatus);
ui.previewButton.addEventListener("click", buildPreview);
ui.copyPreviewButton.addEventListener("click", copyPreview);
ui.convertImageButton.addEventListener("click", convertImageToAscii);
ui.useAsciiButton.addEventListener("click", useAsciiInStatus);
ui.asciiWidth.addEventListener("input", updateAsciiWidthLabel);

ui.presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    ui.statusInput.value = button.dataset.preset || "";
    buildPreview();
  });
});

updateAsciiWidthLabel();
loadSummary();
