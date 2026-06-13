import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// services/transcription/transcribe.py относительно корня монорепо
const SCRIPT_PATH =
  process.env.TRANSCRIBE_SCRIPT ??
  path.resolve(__dirname, "../../../services/transcription/transcribe.py");

const PYTHON = process.env.PYTHON_BIN ?? "python3";

export interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

export interface WhisperResult {
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
}

export interface WhisperOptions {
  language?: string;
  onProgress?: (percent: number) => void | Promise<void>;
}

export function runWhisper(inputPath: string, options: WhisperOptions = {}): Promise<WhisperResult> {
  return new Promise((resolve, reject) => {
    const args = [
      SCRIPT_PATH,
      "--input",
      inputPath,
      "--model",
      process.env.WHISPER_MODEL ?? "large-v2",
      "--device",
      process.env.WHISPER_DEVICE ?? "auto",
    ];
    if (options.language && options.language !== "auto") {
      args.push("--language", options.language);
    }

    const proc = spawn(PYTHON, args, { stdio: ["ignore", "pipe", "pipe"] });

    let stdout = "";
    let stderrTail = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderrTail = (stderrTail + text).slice(-2000);
      // Скрипт пишет строки вида "PROGRESS:42" в stderr
      for (const match of text.matchAll(/PROGRESS:(\d+)/g)) {
        const percent = Number(match[1]);
        if (!Number.isNaN(percent)) void options.onProgress?.(percent);
      }
    });

    proc.on("error", (err) =>
      reject(new Error(`Не удалось запустить транскрибацию: ${err.message}`))
    );

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Транскрибация завершилась с кодом ${code}: ${stderrTail.slice(-500)}`));
        return;
      }
      try {
        const result = JSON.parse(stdout) as WhisperResult;
        resolve(result);
      } catch {
        reject(new Error("Не удалось разобрать результат транскрибации"));
      }
    });
  });
}
