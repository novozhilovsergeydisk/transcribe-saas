import { Worker, type Job } from "bullmq";
import { closePool, loadEnv, transcriptions } from "@repo/db";
import { redisConnectionOptions } from "./redis.js";
import { downloadFromS3, downloadFromUrl, cleanupDir } from "./media.js";
import { runWhisper } from "./whisper.js";
import { addUsage } from "./usage.js";

// Раньше .env подхватывался как побочный эффект Prisma; теперь грузим явно.
loadEnv();

interface TranscriptionJobData {
  transcriptionId: string;
}

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 1);

async function processJob(job: Job<TranscriptionJobData>) {
  const { transcriptionId } = job.data;

  const transcription = await transcriptions.findById(transcriptionId);
  if (!transcription) {
    console.warn(`[${transcriptionId}] запись не найдена, пропускаю`);
    return;
  }

  let workDir: string | null = null;

  try {
    // 1. Получаем исходный файл
    await transcriptions.update(transcriptionId, {
      status: "DOWNLOADING",
      progress: 0,
      error: null,
    });

    let inputPath: string;
    if (transcription.source === "UPLOAD" && transcription.fileKey) {
      ({ workDir, filePath: inputPath } = await downloadFromS3(transcription.fileKey));
    } else if (transcription.source === "URL" && transcription.sourceUrl) {
      ({ workDir, filePath: inputPath } = await downloadFromUrl(transcription.sourceUrl));
    } else {
      throw new Error("У транскрипции нет источника данных");
    }

    // 2. Распознаём речь
    await transcriptions.update(transcriptionId, { status: "PROCESSING", progress: 5 });

    const result = await runWhisper(inputPath, {
      language: transcription.language ?? "auto",
      onProgress: async (percent) => {
        await transcriptions
          .update(transcriptionId, { progress: Math.min(99, percent) })
          .catch(() => {});
      },
    });

    // 3. Сохраняем результат и списываем минуты
    await transcriptions.update(transcriptionId, {
      status: "COMPLETED",
      progress: 100,
      text: result.text,
      segments: result.segments,
      durationSec: result.duration,
      language: result.language,
      completedAt: new Date(),
    });

    await addUsage(transcription.userId, result.duration);
    console.log(`[${transcriptionId}] готово: ${Math.round(result.duration)}с`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${transcriptionId}] ошибка:`, message);
    await transcriptions.update(transcriptionId, {
      status: "FAILED",
      error: message.slice(0, 1000),
    });
    throw error; // даём BullMQ возможность повторить попытку
  } finally {
    if (workDir) await cleanupDir(workDir);
  }
}

const worker = new Worker<TranscriptionJobData>("transcription", processJob, {
  connection: redisConnectionOptions(),
  concurrency: CONCURRENCY,
});

worker.on("ready", () => console.log("Воркер транскрибации запущен"));
worker.on("failed", (job, err) =>
  console.error(`Задача ${job?.id} завершилась с ошибкой: ${err.message}`)
);

async function shutdown() {
  console.log("Останавливаю воркер…");
  await worker.close();
  await closePool();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
