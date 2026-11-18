import { SliderField } from "@/components/slider-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSerial } from "@/features/scanner/api/use-serial";
import {
  levelToPercent,
  percentToLevel,
  SCAN_LIGHT_CAUTION_MAX_PERCENT,
  SCAN_LIGHT_DEFAULT_PERCENT,
  SCAN_LIGHT_FREE_MAX_PERCENT,
  SCAN_LIGHT_UNLOCK_WORD,
  scanLightTier,
} from "@/lib/constants/scan-light";
import { parseSerialReply, statusResetReason } from "@magic-vault/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

type Pending = { percent: number; stage: 0 | 1 | 2 | 3 } | null;

// Brightness slider for the sorter's scan-area light (ESP32-S3 builds). Free
// levels move at once, higher levels need confirmation for the session. The
// device reports its level in getStatus, so the slider starts there (the
// default for older firmware).
export function ScanLightControl() {
  const { t } = useTranslation("scanner");
  const { sendRequest, subscribe, isConnected } = useSerial();
  const [percent, setPercent] = useState(SCAN_LIGHT_DEFAULT_PERCENT);
  const appliedRef = useRef(SCAN_LIGHT_DEFAULT_PERCENT);
  const [cautionAcked, setCautionAcked] = useState(false);
  const [lockedUnlocked, setLockedUnlocked] = useState(false);
  const [brownoutLocked, setBrownoutLocked] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [checks, setChecks] = useState([false, false, false]);
  const [typed, setTyped] = useState("");

  useEffect(
    () =>
      subscribe((message) => {
        if (statusResetReason(message) === "brownout") {
          setBrownoutLocked(true);
          setLockedUnlocked(false);
          setCautionAcked(false);
          setPercent((p) => Math.min(p, SCAN_LIGHT_FREE_MAX_PERCENT));
          appliedRef.current = Math.min(
            appliedRef.current,
            SCAN_LIGHT_FREE_MAX_PERCENT,
          );
        }
      }),
    [subscribe],
  );

  useEffect(() => {
    if (!isConnected) return;
    let cancelled = false;
    void sendRequest({ getStatus: true })
      .then(({ line }) => {
        const light = parseSerialReply(line)?.light;
        if (cancelled || typeof light !== "number") return;
        const next = levelToPercent(light);
        setPercent(next);
        appliedRef.current = next;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isConnected, sendRequest]);

  const send = useCallback(
    async (next: number) => {
      appliedRef.current = next;
      try {
        const { line } = await sendRequest({ setLight: percentToLevel(next) });
        const parsed = parseSerialReply(line);
        if (parsed?.status !== "ok") setUnsupported(true);
      } catch {
        setUnsupported(true);
      }
    },
    [sendRequest],
  );

  const resetDialog = () => {
    setPending(null);
    setChecks([false, false, false]);
    setTyped("");
  };

  const commit = (next: number) => {
    const tier = scanLightTier(next);
    if (tier === "locked" && (brownoutLocked || !lockedUnlocked)) {
      setPending({ percent: next, stage: 1 });
      return;
    }
    if (tier !== "free" && !cautionAcked && !lockedUnlocked) {
      setPending({ percent: next, stage: 0 });
      return;
    }
    setPercent(next);
    void send(next);
  };

  const cancelPending = () => {
    resetDialog();
    setPercent(appliedRef.current);
  };

  if (!isConnected || unsupported) return null;

  const stage = pending?.stage;
  const allChecked = checks.every(Boolean);

  return (
    <>
      <SliderField
        label={t("scanLight.label")}
        valueLabel={`${percent}%`}
        description={t("scanLight.description")}
        min={0}
        max={100}
        value={percent}
        onValueChange={setPercent}
        onValueCommitted={commit}
      >
        {brownoutLocked && (
          <p className="text-xs text-destructive">
            {t("scanLight.brownoutNote", { max: SCAN_LIGHT_FREE_MAX_PERCENT })}
          </p>
        )}
      </SliderField>

      <Dialog open={stage === 0} onOpenChange={(o) => !o && cancelPending()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("scanLight.caution.title")}</DialogTitle>
            <DialogDescription>
              {t("scanLight.caution.body", {
                from: SCAN_LIGHT_FREE_MAX_PERCENT + 1,
                to: SCAN_LIGHT_CAUTION_MAX_PERCENT,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelPending}>
              {t("scanLight.cancel")}
            </Button>
            <Button
              onClick={() => {
                const next = pending?.percent ?? percent;
                setCautionAcked(true);
                resetDialog();
                setPercent(next);
                void send(next);
              }}
            >
              {t("scanLight.caution.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={stage === 1} onOpenChange={(o) => !o && cancelPending()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("scanLight.locked.title")}</DialogTitle>
            <DialogDescription>{t("scanLight.locked.risks")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelPending}>
              {t("scanLight.cancel")}
            </Button>
            <Button
              onClick={() =>
                pending && setPending({ ...pending, stage: 2 })
              }
            >
              {t("scanLight.next")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={stage === 2} onOpenChange={(o) => !o && cancelPending()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("scanLight.locked.checksTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Label key={i} className="items-start gap-2 text-sm font-normal">
                <Checkbox
                  checked={checks[i]}
                  onCheckedChange={(c) =>
                    setChecks((prev) => prev.map((v, j) => (j === i ? !!c : v)))
                  }
                />
                {t(`scanLight.locked.check${i + 1}`)}
              </Label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelPending}>
              {t("scanLight.cancel")}
            </Button>
            <Button
              disabled={!allChecked}
              onClick={() => pending && setPending({ ...pending, stage: 3 })}
            >
              {t("scanLight.next")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={stage === 3} onOpenChange={(o) => !o && cancelPending()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("scanLight.locked.typeTitle")}</DialogTitle>
            <DialogDescription>
              {t("scanLight.locked.typeBody", { word: SCAN_LIGHT_UNLOCK_WORD })}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
          />
          <DialogFooter>
            <Button variant="outline" onClick={cancelPending}>
              {t("scanLight.cancel")}
            </Button>
            <Button
              disabled={typed.trim() !== SCAN_LIGHT_UNLOCK_WORD}
              onClick={() => {
                const next = pending?.percent ?? percent;
                setLockedUnlocked(true);
                setBrownoutLocked(false);
                resetDialog();
                setPercent(next);
                void send(next);
              }}
            >
              {t("scanLight.locked.unlock")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
