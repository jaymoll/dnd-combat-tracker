import { spawn } from "node:child_process";
import { watchFile } from "node:fs";

let child = null;
let restarting = false;

const start = () => {
  child = spawn(process.execPath, ["server.js"], { stdio: "inherit" });
  child.on("exit", (code, signal) => {
    if (!restarting && code !== 0) {
      process.exitCode = code ?? 1;
    }

    if (!restarting && signal) {
      process.kill(process.pid, signal);
    }
  });
};

const restart = () => {
  restarting = true;
  child?.once("exit", () => {
    restarting = false;
    start();
  });
  child?.kill();
};

watchFile("server.js", { interval: 500 }, () => {
  restart();
});

process.on("SIGINT", () => {
  child?.kill("SIGINT");
  process.exit();
});

process.on("SIGTERM", () => {
  child?.kill("SIGTERM");
  process.exit();
});

start();
