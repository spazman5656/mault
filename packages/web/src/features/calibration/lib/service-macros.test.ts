import { describe, expect, it } from "vitest";
import {
  clampMacroCount,
  MACRO_MAX_COUNT,
  runFeedAndDrop,
  type MacroIo,
} from "./service-macros";

function makeIo(
  replies: (command: Record<string, unknown>) => string | null,
  stopAfterCommands = Infinity,
) {
  const commands: Record<string, unknown>[] = [];
  const progress: number[] = [];
  const io: MacroIo = {
    request: async (command) => {
      commands.push(command as Record<string, unknown>);
      return { sent: true, line: replies(command as Record<string, unknown>) };
    },
    shouldStop: () => commands.length >= stopAfterCommands,
    onProgress: (done) => progress.push(done),
  };
  return { io, commands, progress };
}

const okReplies = (command: Record<string, unknown>) =>
  command.feeder
    ? JSON.stringify({ detected: true, empty: false })
    : JSON.stringify({ status: "cleared" });

describe("runFeedAndDrop", () => {
  it("runs every cycle, feeding then dropping in order", async () => {
    const { io, commands, progress } = makeIo(okReplies);
    const result = await runFeedAndDrop(io, 3);
    expect(result).toEqual({ done: 3, total: 3, reason: "completed" });
    expect(commands.map((c) => Object.keys(c)[0])).toEqual([
      "feeder",
      "clearDevice",
      "feeder",
      "clearDevice",
      "feeder",
      "clearDevice",
    ]);
    expect(progress).toEqual([1, 2, 3]);
  });

  it("stops between commands when asked, after 2 full cycles", async () => {
    const { io } = makeIo(okReplies, 4);
    const result = await runFeedAndDrop(io, 10);
    expect(result).toEqual({ done: 2, total: 10, reason: "stopped" });
  });

  it("stops on an empty hopper without dropping", async () => {
    const { io, commands } = makeIo(() =>
      JSON.stringify({ detected: false, empty: true }),
    );
    expect(await runFeedAndDrop(io, 5)).toEqual({
      done: 0,
      total: 5,
      reason: "empty",
    });
    expect(commands).toHaveLength(1);
  });

  it("stops when no card is detected after a feed", async () => {
    const { io, commands } = makeIo(() =>
      JSON.stringify({ detected: false, empty: false }),
    );
    expect((await runFeedAndDrop(io, 5)).reason).toBe("noCard");
    expect(commands).toHaveLength(1);
  });

  it("reports timeout and error", async () => {
    const timeout = makeIo(() => null);
    expect((await runFeedAndDrop(timeout.io, 2)).reason).toBe("timeout");
    const failed = makeIo((c) =>
      c.feeder
        ? JSON.stringify({ detected: true })
        : JSON.stringify({ error: "busy" }),
    );
    expect(await runFeedAndDrop(failed.io, 2)).toEqual({
      done: 0,
      total: 2,
      reason: "error",
    });
  });

  it("caps the count at the maximum", async () => {
    expect(clampMacroCount(500)).toBe(MACRO_MAX_COUNT);
    expect(clampMacroCount(0)).toBe(1);
    expect(clampMacroCount(Number.NaN)).toBe(1);
    const { io } = makeIo(okReplies);
    const result = await runFeedAndDrop(io, 500);
    expect(result.total).toBe(MACRO_MAX_COUNT);
    expect(result.done).toBe(MACRO_MAX_COUNT);
  });
});
