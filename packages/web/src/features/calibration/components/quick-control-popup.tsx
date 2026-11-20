import { Button } from "@/components/ui/button";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import { useDraggablePosition } from "@/features/scanner/api/use-draggable-position";
import { useResetToNeutral } from "@/features/scanner/api/use-reset-to-neutral";
import { ScanLightControl } from "@/features/scanner/components/scan-light-control";
import {
  QUICK_CONTROL_POPUP_MINIMIZED_STORAGE_KEY,
  QUICK_CONTROL_POPUP_POSITION_STORAGE_KEY,
} from "@/lib/constants/storage-keys";
import { cn } from "@/lib/utils";
import { computeBinCount } from "@magic-vault/shared";
import {
  IconChevronUp,
  IconGripHorizontal,
  IconLoader2,
  IconMinus,
  IconPackage,
  IconRotate2,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export type QuickControlPopupProps = {
  activeBin: number | null;
  isReady: boolean;
  isConnected: boolean;
  isSampleRunning: boolean;
  isMacroRunning: boolean;
  onTestBin: (bin: number) => void;
  onFeed: () => void;
  onDropCard: () => void;
};

function readMinimized() {
  try {
    return (
      localStorage.getItem(QUICK_CONTROL_POPUP_MINIMIZED_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
}

// Draggable panel with the controls needed while tuning servos and timings:
// bin routing tests, Reset to Neutral, Feed, Drop Card and the scan light.
// Mounted once in the calibrate layout so it survives tab switches.
export function QuickControlPopup({
  activeBin,
  isReady,
  isConnected,
  isSampleRunning,
  isMacroRunning,
  onTestBin,
  onFeed,
  onDropCard,
}: QuickControlPopupProps) {
  const { t } = useTranslation("calibration");
  const moduleCount = useModuleCount();
  const { handleResetToNeutral, isResetting } = useResetToNeutral();
  const [minimized, setMinimizedState] = useState(readMinimized);
  const { panelRef, style, isMoved, handleProps } = useDraggablePosition(
    QUICK_CONTROL_POPUP_POSITION_STORAGE_KEY,
  );

  const setMinimized = (next: boolean) => {
    setMinimizedState(next);
    try {
      localStorage.setItem(
        QUICK_CONTROL_POPUP_MINIMIZED_STORAGE_KEY,
        String(next),
      );
    } catch {}
  };

  const bins = Array.from(
    { length: computeBinCount(moduleCount) },
    (_, i) => i + 1,
  );
  const busy =
    activeBin !== null || isSampleRunning || isResetting || isMacroRunning;

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        aria-label={t("quickControlPopup.expand")}
        title={t("quickControlPopup.expand")}
        className="fixed bottom-0 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-t-lg border border-b-0 bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <IconChevronUp size={16} className="text-foreground/70" />
        {t("quickControlPopup.title")}
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      style={style}
      className={cn(
        "fixed z-50 w-64 overflow-hidden rounded-lg border bg-background shadow-xl",
        !isMoved && "bottom-8 left-4",
      )}
    >
      <div className="flex items-center border-b bg-muted/50">
        <div
          {...handleProps}
          title={t("quickControlPopup.dragHandle")}
          aria-label={t("quickControlPopup.dragHandle")}
          className="flex h-8 flex-1 cursor-grab touch-none select-none items-center gap-1.5 px-2 text-sm font-medium text-foreground/80 active:cursor-grabbing"
        >
          <IconGripHorizontal size={14} />
          {t("quickControlPopup.title")}
        </div>
        <button
          type="button"
          onClick={() => setMinimized(true)}
          aria-label={t("quickControlPopup.minimize")}
          title={t("quickControlPopup.minimize")}
          className="flex size-8 items-center justify-center text-foreground/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <IconMinus size={16} />
        </button>
      </div>
      <div className="flex flex-col gap-2 p-2">
        <div className="flex flex-wrap gap-1.5">
          {bins.map((bin) => (
            <Button
              key={bin}
              size="sm"
              variant={
                activeBin === bin && !isSampleRunning
                  ? "outline-selected"
                  : "outline"
              }
              disabled={!isReady || busy}
              onClick={() => onTestBin(bin)}
            >
              <IconPackage />
              {t("binLabel", {
                bin: activeBin === bin && !isSampleRunning ? "…" : bin,
              })}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={!isReady || busy}
            onClick={handleResetToNeutral}
          >
            {isResetting ? (
              <IconLoader2 className="animate-spin" />
            ) : (
              <IconRotate2 />
            )}
            {t("binRoutingControls.resetToNeutral")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!isReady || busy}
            onClick={onFeed}
          >
            {t("binRoutingControls.feed")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!isReady || busy}
            onClick={onDropCard}
          >
            {t("binRoutingControls.dropCard")}
          </Button>
        </div>
        {isConnected && <ScanLightControl />}
      </div>
    </div>
  );
}
