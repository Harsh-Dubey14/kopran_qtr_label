#!/usr/bin/env node
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

function runCommand(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      cmd,
      args,
      Object.assign({ stdio: "inherit", shell: true }, opts)
    );
    proc.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`))
    );
  });
}

async function installAll() {
  console.log("Installing root dependencies (no package-lock)...");
  await runCommand("npm", ["install", "--no-package-lock"]);

  console.log("Installing backend dependencies (no package-lock)...");
  try {
    await runCommand("npm", [
      "install",
      "--prefix",
      "backend",
      "--no-package-lock",
    ]);
  } catch (err) {
    console.warn(
      "Backend install failed; removing backend lockfiles and retrying:",
      err && err.message
    );
    await removeLockfiles(path.join(process.cwd(), "backend"));
    await runCommand("npm", [
      "install",
      "--prefix",
      "backend",
      "--no-package-lock",
    ]);
  }

  console.log("Installing app dependencies (no package-lock)...");
  try {
    await runCommand("npm", [
      "install",
      "--prefix",
      "app",
      "--no-package-lock",
    ]);
  } catch (err) {
    console.warn(
      "App install failed; removing app lockfiles and retrying:",
      err && err.message
    );
    await removeLockfiles(path.join(process.cwd(), "app"));
    await runCommand("npm", [
      "install",
      "--prefix",
      "app",
      "--no-package-lock",
    ]);
  }
}

async function removeLockfiles(startDir) {
  async function walker(dir) {
    let entries;
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch (e) {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        await walker(full);
      } else if (ent.isFile() && ent.name === "package-lock.json") {
        try {
          await fs.promises.unlink(full);
          console.log("Removed lockfile:", full);
        } catch (e) {
          console.warn("Failed to remove lockfile", full, e && e.message);
        }
      }
    }
  }
  await walker(startDir);
}

async function startAll() {
  console.log("Starting backend and app (logs streamed).");
  // Spawn backend and app with npm using --prefix so they run in their folders
  const backend = spawn("npm", ["run", "start", "--prefix", "backend"], {
    stdio: "inherit",
    shell: true,
  });
  const app = spawn("npm", ["run", "start", "--prefix", "app"], {
    stdio: "inherit",
    shell: true,
  });

  // keep process alive until both exit
  await new Promise((resolve) => {
    let count = 0;
    const onExit = () => {
      count += 1;
      if (count >= 2) resolve();
    };
    backend.on("close", onExit);
    app.on("close", onExit);
  });
}

async function main() {
  try {
    await installAll();
    await startAll();
  } catch (e) {
    console.error("Failed to install or start:", e && e.stack);
    process.exit(1);
  }
}

main();
