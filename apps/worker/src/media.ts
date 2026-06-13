import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
  },
});

const S3_BUCKET = process.env.S3_BUCKET ?? "transcriptions";

export interface DownloadResult {
  workDir: string;
  filePath: string;
}

export async function downloadFromS3(fileKey: string): Promise<DownloadResult> {
  const workDir = await mkdtemp(path.join(tmpdir(), "transcription-"));
  const filePath = path.join(workDir, path.basename(fileKey));

  const response = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: fileKey }));
  if (!response.Body) throw new Error("Файл не найден в хранилище");

  await pipeline(response.Body as Readable, createWriteStream(filePath));
  return { workDir, filePath };
}

export async function downloadFromUrl(url: string): Promise<DownloadResult> {
  const workDir = await mkdtemp(path.join(tmpdir(), "transcription-"));
  const outputTemplate = path.join(workDir, "audio.%(ext)s");

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(
      "yt-dlp",
      [
        "--no-playlist",
        "-x",
        "--audio-format",
        "mp3",
        "--max-filesize",
        "2G",
        "-o",
        outputTemplate,
        url,
      ],
      { stdio: ["ignore", "inherit", "pipe"] }
    );

    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`yt-dlp завершился с кодом ${code}: ${stderr.slice(-500)}`));
    });
  });

  const files = await readdir(workDir);
  const audioFile = files.find((f) => f.startsWith("audio."));
  if (!audioFile) throw new Error("Не удалось скачать аудио по ссылке");

  return { workDir, filePath: path.join(workDir, audioFile) };
}

export async function cleanupDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true }).catch(() => {});
}
