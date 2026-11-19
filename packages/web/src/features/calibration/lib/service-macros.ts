import {
  JAM_CLEAR_DEVICE_TIMEOUT_MS,
  parseSerialReply,
} from "@magic-vault/shared";

export const MACRO_MAX_COUNT = 100;
const FEED_TIMEOUT_MS = 10000;

export type MacroStopReason =
  | "completed"
  | "stopped"
  | "empty"
  | "noCard"
  | "error"
  | "timeout";

export interface MacroResult {
  done: number;
  total: number;
  reason: MacroStopReason;
}

export interface MacroIo {
  request: (
    command: object,
    timeoutMs: number,
  ) => Promise<{ sent: boolean; line: string | null }>;
  shouldStop: () => boolean;
  onProgress: (done: number) => void;
}

export interface ServiceMacro {
  id: string;
  labelKey: string;
  run: (io: MacroIo, count: number) => Promise<MacroResult>;
}

export function clampMacroCount(count: number): number {
  if (!Number.isFinite(count)) return 1;
  return Math.min(MACRO_MAX_COUNT, Math.max(1, Math.floor(count)));
}

type StepOutcome =
  | { ok: true; fields: Record<string, unknown> }
  | { ok: false; reason: "error" | "timeout" };

async function step(
  io: MacroIo,
  command: object,
  timeoutMs: number,
): Promise<StepOutcome> {
  const { sent, line } = await io.request(command, timeoutMs);
  if (!sent) return { ok: false, reason: "error" };
  if (!line) return { ok: false, reason: "timeout" };
  const fields = parseSerialReply(line);
  if (!fields || fields.error) return { ok: false, reason: "error" };
  return { ok: true, fields };
}

export async function runFeedAndDrop(
  io: MacroIo,
  requested: number,
): Promise<MacroResult> {
  const total = clampMacroCount(requested);
  let done = 0;
  const stopWith = (reason: MacroStopReason): MacroResult => ({
    done,
    total,
    reason,
  });
  while (done < total) {
    if (io.shouldStop()) return stopWith("stopped");
    const feed = await step(io, { feeder: true }, FEED_TIMEOUT_MS);
    if (!feed.ok) return stopWith(feed.reason);
    if (feed.fields.empty) return stopWith("empty");
    if (feed.fields.detected === false) return stopWith("noCard");
    const drop = await step(
      io,
      { clearDevice: true },
      JAM_CLEAR_DEVICE_TIMEOUT_MS,
    );
    if (!drop.ok) return stopWith(drop.reason);
    if (drop.fields.status !== "cleared") return stopWith("error");
    done += 1;
    io.onProgress(done);
  }
  return stopWith("completed");
}

export const SERVICE_MACROS: ServiceMacro[] = [
  {
    id: "feedAndDrop",
    labelKey: "serviceMacros.feedAndDrop.label",
    run: runFeedAndDrop,
  },
];
