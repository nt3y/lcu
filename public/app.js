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
};

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

ui.refreshButton.addEventListener("click", loadSummary);
ui.applyButton.addEventListener("click", applyStatus);
ui.previewButton.addEventListener("click", buildPreview);
ui.copyPreviewButton.addEventListener("click", copyPreview);

ui.presetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    ui.statusInput.value = button.dataset.preset || "";
    buildPreview();
  });
});

loadSummary();
