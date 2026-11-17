import { isOverrideBin, sortOverrideBins } from "@magic-vault/shared";

import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useTranslation } from "react-i18next";

export function BinOrderPanel() {
  const { t } = useTranslation("bins");
  const { configs, selectedBin, setSelectedBin } = useBinConfigs();

  const overrides = sortOverrideBins(configs).filter((c) => !c.isCatchAll);
  const normal = configs.filter(
    (c) =>
      !c.isCatchAll &&
      !isOverrideBin(c) &&
      !c.isDisabled &&
      c.rules.conditions.length > 0,
  );
  const catchAll = configs.find((c) => c.isCatchAll);

  const row = (binNumber: number, note?: string) => (
    <li key={binNumber}>
      <button
        type="button"
        onClick={() => setSelectedBin(binNumber)}
        className={`w-full rounded px-1.5 py-0.5 text-left text-xs hover:bg-muted ${
          binNumber === selectedBin ? "bg-muted font-medium" : ""
        }`}
      >
        {t("ruleTools.orderBin", { bin: binNumber })}
        {note ? ` (${note})` : ""}
      </button>
    </li>
  );

  const section = (title: string, items: React.ReactNode[]) => (
    <div>
      <p className="text-xs font-medium">{title}</p>
      {items.length > 0 ? (
        <ol className="list-decimal pl-5">{items}</ol>
      ) : (
        <p className="pl-1.5 text-xs text-foreground/70">
          {t("ruleTools.orderEmpty")}
        </p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-2.5">
      <div>
        <p className="text-sm font-medium">{t("ruleTools.orderHeading")}</p>
        <p className="text-xs text-foreground/70">
          {t("ruleTools.orderDescription")}
        </p>
      </div>
      {section(
        t("ruleTools.orderOverrides"),
        overrides.map((c) =>
          row(
            c.binNumber,
            c.overridePriority != null
              ? t("ruleTools.orderPriority", { priority: c.overridePriority })
              : t("ruleTools.orderNoPriority"),
          ),
        ),
      )}
      {section(
        t("ruleTools.orderNormal"),
        normal.map((c) => row(c.binNumber)),
      )}
      {section(
        t("ruleTools.orderCatchAll"),
        catchAll ? [row(catchAll.binNumber)] : [],
      )}
    </div>
  );
}
