const express = require("express");
const path = require("path");
const {
  buildAsciiPreview,
  findLockfile,
  getLeagueSummary,
  setCustomStatus,
} = require("./src/lcu");

const app = express();
const port = process.env.PORT || 3147;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "Natty" });
});

app.get("/api/league/summary", async (_req, res) => {
  try {
    const summary = await getLeagueSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      hint:
        "Make sure League of Legends is open and logged in. You can also set LEAGUE_LOCKFILE if your install path is custom.",
    });
  }
});

app.get("/api/league/lockfile", async (_req, res) => {
  try {
    const lockfile = await findLockfile();
    res.json({ lockfile });
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.post("/api/league/status", async (req, res) => {
  const statusMessage = String(req.body?.statusMessage || "");

  try {
    const result = await setCustomStatus(statusMessage);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error.message,
      hint:
        "League needs to be running. If Riot changes the chat payload shape, Natty will surface that here.",
    });
  }
});

app.post("/api/text/fullwidth", (req, res) => {
  const text = String(req.body?.text || "");
  res.json({ preview: buildAsciiPreview(text) });
});

app.listen(port, () => {
  console.log(`Natty is running at http://localhost:${port}`);
});
