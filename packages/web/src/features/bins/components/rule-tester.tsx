import {
  type BinConfig,
  type BinRuleGroup,
  evaluateCardBin,
  evaluateRuleGroup,
  type SourceCard,
} from "@magic-vault/shared";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRuleMatchCount } from "@/features/bins/api/sort-bins";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useCollections } from "@/features/collections/api/use-collections";
import { getSampleCard } from "@/features/games/api/games";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface TestedCard {
  name: string;
  card: SourceCard;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function RuleTester({ rules }: { rules: BinRuleGroup }) {
  const { t } = useTranslation("bins");
  const { configs, ruleFieldDefinitions, gameKey } = useBinConfigs();
  const { activeCollection } = useCollections();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tested, setTested] = useState<TestedCard | null>(null);
  const [counting, setCounting] = useState(false);
  const [countText, setCountText] = useState<string | null>(null);

  async function testCard() {
    if (!gameKey || !query.trim() || loading) return;
    setLoading(true);
    setError(null);
    const result = await getSampleCard(gameKey, query.trim());
    setLoading(false);
    if (!result.success || !result.data || !isPlainObject(result.data.raw)) {
      setTested(null);
      setError(result.message || t("ruleTools.notFound"));
      return;
    }
    setTested({
      name: result.data.name,
      card: { name: result.data.name, raw: result.data.raw } as SourceCard,
    });
  }

  async function countCards() {
    if (!activeCollection?.guid) {
      setCountText(t("ruleTools.countNeedsCollection"));
      return;
    }
    setCounting(true);
    const result = await getRuleMatchCount(rules, activeCollection.guid);
    setCounting(false);
    setCountText(
      result.success && result.data
        ? t("ruleTools.countResult", result.data)
        : result.message || t("ruleTools.countError"),
    );
  }

  const bin: BinConfig | undefined = tested
    ? evaluateCardBin(tested.card, configs, ruleFieldDefinitions)
    : undefined;
  const draftMatches = tested
    ? evaluateRuleGroup(tested.card, rules, ruleFieldDefinitions)
    : false;

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-2.5">
      <div>
        <p className="text-sm font-medium">{t("ruleTools.testHeading")}</p>
        <p className="text-xs text-foreground/70">
          {t("ruleTools.testDescription")}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Input
          type="text"
          className="min-w-32 flex-1"
          placeholder={t("ruleTools.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void testCard();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={!gameKey || !query.trim() || loading}
          onClick={testCard}
        >
          {loading ? t("ruleTools.searching") : t("ruleTools.search")}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {tested && (
        <div className="flex flex-col gap-0.5 text-xs">
          <p className="font-medium">{tested.name}</p>
          <p>
            {bin
              ? t("ruleTools.goesTo", { bin: bin.binNumber })
              : t("ruleTools.goesToNone")}
          </p>
          <p className="text-foreground/70">
            {draftMatches
              ? t("ruleTools.draftMatches")
              : t("ruleTools.draftNoMatch")}
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={counting || rules.conditions.length === 0}
          onClick={countCards}
        >
          {counting ? t("ruleTools.counting") : t("ruleTools.countButton")}
        </Button>
        {countText && <p className="text-xs">{countText}</p>}
      </div>
    </div>
  );
}
