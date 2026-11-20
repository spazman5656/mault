import { useCollectionCardsSummary } from "@/features/collections/api/use-collection-cards";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { ScannerPipPreview } from "@/features/scanner/components/scanner-pip-preview";
import { StationStatusDot } from "@/features/scanner/components/station-status-dot";
import { useDraggablePosition } from "@/features/scanner/api/use-draggable-position";
import {
  SCANNER_PIP_MINIMIZED_STORAGE_KEY,
  SCANNER_PIP_POSITION_STORAGE_KEY,
} from "@/lib/constants/storage-keys";
import { cn } from "@/lib/utils";
import {
  IconChevronLeft,
  IconChevronRight,
  IconGripHorizontal,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

function readMinimized() {
  try {
    return localStorage.getItem(SCANNER_PIP_MINIMIZED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function ScannerPip() {
  const { t } = useTranslation("scanner");
  const navigate = useNavigate();
  const { station } = useStation();
  const { panelLayout, panelsDocked, connectedStationIds } = useStations();
  const { isTimerActive } = useScannedCards();
  const { totalCount } = useCollectionCardsSummary();
  const [minimized, setMinimizedState] = useState(readMinimized);
  const { panelRef, style, isMoved, handleProps } = useDraggablePosition(
    SCANNER_PIP_POSITION_STORAGE_KEY,
  );

  const isVisible =
    !!panelLayout && !panelsDocked && connectedStationIds.has(station.id);

  const setMinimized = (next: boolean) => {
    setMinimizedState(next);
    try {
      localStorage.setItem(SCANNER_PIP_MINIMIZED_STORAGE_KEY, String(next));
    } catch {}
  };

  if (!isVisible) return null;

  if (minimized) {
    const statusLabel = isTimerActive
      ? t("scannerPip.sorting")
      : t("scannerPip.paused");
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        aria-label={t("scannerPip.expand")}
        title={t("scannerPip.expand")}
        className="fixed bottom-8 right-0 z-50 flex items-center gap-2 rounded-l-lg border border-r-0 bg-background py-2 pr-2.5 pl-1.5 text-sm font-medium text-foreground shadow-xl transition-[padding] hover:pl-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <IconChevronLeft size={16} className="text-foreground/70" />
        <StationStatusDot status={isTimerActive ? "sorting" : "paused"} />
        <span className="sr-only">{statusLabel}</span>
        <span className="tabular-nums">{totalCount}</span>
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      style={style}
      className={cn(
        "fixed z-50 w-48 overflow-hidden rounded-lg border bg-background shadow-xl",
        !isMoved && "bottom-8 right-4",
      )}
    >
      <div
        {...handleProps}
        title={t("scannerPip.dragHandle")}
        aria-label={t("scannerPip.dragHandle")}
        className="flex h-5 cursor-grab touch-none select-none items-center justify-center border-b bg-muted/50 text-foreground/60 active:cursor-grabbing"
      >
        <IconGripHorizontal size={14} />
      </div>
      <ScannerPipPreview
        variant="overlay"
        onOpen={() => navigate("/app")}
        action={{
          label: t("scannerPip.minimize"),
          icon: <IconChevronRight size={16} />,
          onClick: () => setMinimized(true),
        }}
      />
    </div>
  );
}
