import { useCallback, useRef, useState } from "react";
import {
  clampMacroCount,
  SERVICE_MACROS,
  type MacroResult,
} from "@/features/calibration/lib/service-macros";

interface ServiceMacroRunOptions {
  isReady: boolean;
  sendRequest: (
    command: object,
    timeoutMs?: number,
  ) => Promise<{ sent: boolean; line: string | null }>;
  applyDraftsToDevice: () => Promise<void>;
}

export function useServiceMacroRun({
  isReady,
  sendRequest,
  applyDraftsToDevice,
}: ServiceMacroRunOptions) {
  const [isMacroRunning, setIsMacroRunning] = useState(false);
  const [macroProgress, setMacroProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [macroResult, setMacroResult] = useState<MacroResult | null>(null);
  const stopRef = useRef(false);
  const runningRef = useRef(false);

  const startMacro = useCallback(
    async (macroId: string, count: number) => {
      const macro = SERVICE_MACROS.find((m) => m.id === macroId);
      if (!macro || !isReady || runningRef.current) return;
      runningRef.current = true;
      stopRef.current = false;
      const total = clampMacroCount(count);
      setIsMacroRunning(true);
      setMacroResult(null);
      setMacroProgress({ done: 0, total });
      try {
        await applyDraftsToDevice();
        const result = await macro.run(
          {
            request: (command, timeoutMs) => sendRequest(command, timeoutMs),
            shouldStop: () => stopRef.current,
            onProgress: (done) => setMacroProgress({ done, total }),
          },
          total,
        );
        setMacroResult(result);
        setMacroProgress({ done: result.done, total: result.total });
      } finally {
        runningRef.current = false;
        setIsMacroRunning(false);
      }
    },
    [isReady, sendRequest, applyDraftsToDevice],
  );

  // Takes effect between commands: a command already sent cannot be aborted.
  const stopMacro = useCallback(() => {
    stopRef.current = true;
  }, []);

  return {
    isMacroRunning,
    macroProgress,
    macroResult,
    startMacro,
    stopMacro,
  };
}
