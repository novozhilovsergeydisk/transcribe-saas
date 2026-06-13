import { Queue } from "bullmq";

export interface TranscriptionJobData {
  transcriptionId: string;
}

/** Опции подключения для BullMQ из REDIS_URL
 *  (объект вместо инстанса ioredis — чтобы не зависеть от версии,
 *  с которой собран сам BullMQ). */
function redisConnectionOptions() {
  const url = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : undefined,
    maxRetriesPerRequest: null,
  };
}

const globalForQueue = globalThis as unknown as {
  transcriptionQueue?: Queue<TranscriptionJobData>;
};

function createQueue() {
  return new Queue<TranscriptionJobData>("transcription", {
    connection: redisConnectionOptions(),
  });
}

export const transcriptionQueue = globalForQueue.transcriptionQueue ?? createQueue();

if (process.env.NODE_ENV !== "production") {
  globalForQueue.transcriptionQueue = transcriptionQueue;
}

export async function enqueueTranscription(transcriptionId: string, priority?: number) {
  await transcriptionQueue.add(
    "transcribe",
    { transcriptionId },
    {
      priority, // меньше = выше приоритет (Pro/Business получают 1, Free — 10)
      attempts: 2,
      backoff: { type: "exponential", delay: 30_000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    }
  );
}
