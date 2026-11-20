import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

type Point = { x: number; y: number };

function readStored(key: string): Point | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Point>;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {}
  return null;
}

function clamp(point: Point, width: number, height: number): Point {
  return {
    x: Math.min(Math.max(0, point.x), Math.max(0, window.innerWidth - width)),
    y: Math.min(Math.max(0, point.y), Math.max(0, window.innerHeight - height)),
  };
}

// Pointer-event drag for a fixed-position panel. `position` stays null until
// the panel is first moved, so the caller's default placement classes apply.
// Only the element given `handleProps` starts a drag, so buttons and sliders in
// the panel body stay clickable.
export function useDraggablePosition(storageKey: string) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Point | null>(() =>
    readStored(storageKey),
  );
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const latestRef = useRef<Point | null>(position);

  const persist = useCallback(
    (point: Point) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(point));
      } catch {}
    },
    [storageKey],
  );

  const reclamp = useCallback(() => {
    const el = panelRef.current;
    const current = latestRef.current;
    if (!el || !current) return;
    const { width, height } = el.getBoundingClientRect();
    const next = clamp(current, width, height);
    if (next.x !== current.x || next.y !== current.y) {
      latestRef.current = next;
      setPosition(next);
      persist(next);
    }
  }, [persist]);

  useEffect(() => {
    reclamp();
    window.addEventListener("resize", reclamp);
    return () => window.removeEventListener("resize", reclamp);
  }, [reclamp]);

  const onPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    const el = panelRef.current;
    if (!drag || !el || drag.pointerId !== event.pointerId) return;
    const { width, height } = el.getBoundingClientRect();
    const next = clamp(
      {
        x: drag.originX + event.clientX - drag.startX,
        y: drag.originY + event.clientY - drag.startY,
      },
      width,
      height,
    );
    latestRef.current = next;
    setPosition(next);
  };

  const endDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (latestRef.current) persist(latestRef.current);
  };

  const style: CSSProperties | undefined = position
    ? { left: position.x, top: position.y, right: "auto", bottom: "auto" }
    : undefined;

  return {
    panelRef,
    style,
    isMoved: position !== null,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
