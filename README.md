# Natty

Natty is a local Node.js browser app for the League of Legends client. It shows your `gameName`, your friend count, and lets you set a custom profile status with ASCII, emojis, or a fullwidth preview that can look visually larger.

## What it does

- Reads the League Client lockfile on your machine.
- Shows your current `gameName` and tag.
- Counts total friends and online friends.
- Displays your current League chat status.
- Lets you update your custom status from a local browser UI.
- Generates a fullwidth preview for stylized text.

## Run locally

```bash
npm install
npm start
```

Then open [http://localhost:3147](http://localhost:3147).

## macOS installer

Use [install-natty-macos.sh](/C:/Users/Natty/Desktop/lcu/install-natty-macos.sh).

This is the line where you put your GitHub repo:

```bash
REPO_URL="https://github.com/your-name/your-repo.git"
```

Replace it with your real repository URL before sharing the script.

## Notes

- If Node.js is missing, the macOS installer installs it with Homebrew.
- If Git is missing, the macOS installer installs Git too.
- If League is in a custom location, set `LEAGUE_LOCKFILE` before starting Natty.
- Riot can change unsupported LCU endpoints at any time, so status updates may need small adjustments later.
