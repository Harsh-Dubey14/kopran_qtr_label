#!/usr/bin/env node
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = process.cwd();

function runCmd(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (err, stdout, stderr) => {
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      resolve();
    });
  });
}

async function killNodeProcesses() {
  try {
    if (process.platform === "win32") {
      await runCmd("taskkill /IM node.exe /F 2>nul");
      await runCmd("taskkill /IM npm.exe /F 2>nul");
    } else {
      await runCmd("pkill -f node || true");
      await runCmd("pkill -f npm || true");
    }
    console.log("Attempted to kill node/npm processes (if any).");
  } catch (e) {
    console.warn("Failed to kill processes:", e && e.message);
  }
}

async function removeNodeModules(startDir) {
  const skip = new Set([".git", "node_modules"]);

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
        if (ent.name === "node_modules") {
          try {
            // Node 14+ supports rm with recursive
            if (fs.promises.rm) {
              await fs.promises.rm(full, { recursive: true, force: true });
            } else {
              await fs.promises.rmdir(full, { recursive: true });
            }
            console.log("Removed", full);
          } catch (e) {
            console.warn("Failed to remove", full, e && e.message);
          }
          // skip recursing into this folder
          continue;
        }
        if (skip.has(ent.name)) continue;
        await walker(full);
      }
    }
  }

  await walker(startDir);
}

async function main() {
  console.log("Logoff: killing node processes and removing node_modules...");
  await killNodeProcesses();
  await removeNodeModules(root);
  console.log("Logoff completed.");
}

main().catch((e) => {
  console.error("Error during loggoff:", e && e.stack);
  process.exit(1);
});
