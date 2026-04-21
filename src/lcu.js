const fs = require("fs/promises");
const https = require("https");
const path = require("path");

const DEFAULT_LOCKFILE_CANDIDATES = [
  process.env.LEAGUE_LOCKFILE,
  "/Applications/League of Legends.app/Contents/LoL/lockfile",
  path.join(process.env.HOME || "", "Applications/League of Legends.app/Contents/LoL/lockfile"),
].filter(Boolean);

function requestJson({ method = "GET", port, password, endpoint, body }) {
  const basicAuth = Buffer.from(`riot:${password}`).toString("base64");

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host: "127.0.0.1",
        port,
        path: endpoint,
        method,
        rejectUnauthorized: false,
        headers: {
          Authorization: `Basic ${basicAuth}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let raw = "";

        res.on("data", (chunk) => {
          raw += chunk;
        });

        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(
              new Error(
                `LCU request failed: ${res.statusCode} ${res.statusMessage || ""} ${raw}`.trim(),
              ),
            );
            return;
          }

          if (!raw) {
            resolve(null);
            return;
          }

          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(new Error(`Failed to parse LCU response from ${endpoint}: ${error.message}`));
          }
        });
      },
    );

    req.on("error", reject);

    if (body !== undefined) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findLockfile() {
  for (const candidate of DEFAULT_LOCKFILE_CANDIDATES) {
    if (await exists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "League lockfile not found. Set LEAGUE_LOCKFILE to your lockfile path if League is installed somewhere custom.",
  );
}

async function readLockfile() {
  const lockfilePath = await findLockfile();
  const raw = await fs.readFile(lockfilePath, "utf8");
  const [processName, pid, port, password, protocol] = raw.trim().split(":");

  if (!processName || !pid || !port || !password || !protocol) {
    throw new Error(`Unexpected lockfile format in ${lockfilePath}`);
  }

  return {
    lockfilePath,
    processName,
    pid: Number(pid),
    port: Number(port),
    password,
    protocol,
  };
}

async function getLeagueSummary() {
  const lockfile = await readLockfile();
  const [summoner, friends, me] = await Promise.all([
    requestJson({
      port: lockfile.port,
      password: lockfile.password,
      endpoint: "/lol-summoner/v1/current-summoner",
    }),
    requestJson({
      port: lockfile.port,
      password: lockfile.password,
      endpoint: "/lol-chat/v1/friends",
    }),
    requestJson({
      port: lockfile.port,
      password: lockfile.password,
      endpoint: "/lol-chat/v1/me",
    }),
  ]);

  return {
    connected: true,
    lockfile: lockfile.lockfilePath,
    summoner: {
      displayName: summoner.displayName || null,
      gameName: summoner.gameName || summoner.displayName || null,
      tagLine: summoner.tagLine || null,
      level: summoner.summonerLevel || null,
      profileIconId: summoner.profileIconId || null,
      puuid: summoner.puuid || null,
    },
    chat: {
      availability: me?.availability || null,
      icon: me?.icon || null,
      statusMessage: me?.statusMessage || "",
    },
    friends: {
      total: Array.isArray(friends) ? friends.length : 0,
      online: Array.isArray(friends)
        ? friends.filter((friend) => friend.availability && friend.availability !== "offline").length
        : 0,
    },
  };
}

async function setCustomStatus(statusMessage) {
  const lockfile = await readLockfile();
  const current = await requestJson({
    port: lockfile.port,
    password: lockfile.password,
    endpoint: "/lol-chat/v1/me",
  });

  const payload = {
    ...current,
    statusMessage,
  };

  await requestJson({
    method: "PUT",
    port: lockfile.port,
    password: lockfile.password,
    endpoint: "/lol-chat/v1/me",
    body: payload,
  });

  return {
    ok: true,
    statusMessage,
  };
}

function buildAsciiPreview(input) {
  return Array.from(input).map(toFullwidth).join("");
}

function toFullwidth(char) {
  const code = char.charCodeAt(0);

  if (char === " ") {
    return "\u3000";
  }

  if (code >= 33 && code <= 126) {
    return String.fromCharCode(code + 65248);
  }

  return char;
}

module.exports = {
  buildAsciiPreview,
  findLockfile,
  getLeagueSummary,
  setCustomStatus,
};
