import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import {
  clampMacroCount,
  MACRO_MAX_COUNT,
  type MacroResult,
} from "@/features/calibration/lib/service-macros";

interface ServiceMacroPanelProps {
  isReady: boolean;
  busy: boolean;
  isRunning: boolean;
  progress: { done: number; total: number } | null;
  result: MacroResult | null;
  onStart: (macroId: string, count: number) => void;
  onStop: () => void;
}

export function ServiceMacroPanel({
  isReady,
  busy,
  isRunning,
  progress,
  result,
  onStart,
  onStop,
}: ServiceMacroPanelProps) {
  const { t } = useTranslation("calibration");
  const [countText, setCountText] = useState("7");
  const count = clampMacroCount(Number(countText));

  return (
    <SettingsSection label={t("serviceMacros.label")}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm">{t("serviceMacros.feedAndDrop.label")}</span>
        <input
          type="number"
          min={1}
          max={MACRO_MAX_COUNT}
          value={countText}
          disabled={isRunning}
          aria-label={t("serviceMacros.count")}
          className="w-20 rounded-md border bg-background px-2 py-1 text-sm"
          onChange={(e) => setCountText(e.target.value)}
          onBlur={() => setCountText(String(count))}
        />
        <Button
          variant="outline"
          disabled={!isReady || busy || isRunning}
          onClick={() => onStart("feedAndDrop", count)}
        >
          {t("serviceMacros.start")}
        </Button>
        <Button variant="outline" disabled={!isRunning} onClick={onStop}>
          {t("serviceMacros.stop")}
        </Button>
        {progress && (
          <span className="text-sm text-foreground/70">
            {t("serviceMacros.progress", {
              done: progress.done,
              total: progress.total,
            })}
          </span>
        )}
        {result && !isRunning && (
          <span className="text-sm text-foreground/70">
            {t(`serviceMacros.reason.${result.reason}`)}
          </span>
        )}
      </div>
    </SettingsSection>
  );
}
