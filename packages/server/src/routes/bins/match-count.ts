import {
  evaluateRuleGroup,
  type BinRuleGroup,
  type FieldMeta,
  type SourceCard,
} from "@magic-vault/shared";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { authQuery } from "../../db";
import { CARD_CATALOG_ALIAS } from "../../lib/constants/saved-cards";
import { CC_ALIAS_SQL_COLUMNS } from "../../lib/constants/card-prices";
import { cardCatalogJoinSql } from "../../lib/card-catalog-sql";
import { requireAuth, requireOrg, type AppEnv } from "../../middleware/auth";
import { findCardsCollection } from "../collections/cards-query";
import { validateBinRules } from "./validate-rules";

export const MATCH_COUNT_CARD_LIMIT = 50_000;

export function countMatchingCards(
  cards: SourceCard[],
  rules: BinRuleGroup,
  fieldDefinitions: FieldMeta[],
): number {
  if (rules.conditions.length === 0) return 0;
  return cards.filter((card) =>
    evaluateRuleGroup(card, rules, fieldDefinitions),
  ).length;
}

export const binMatchCountRoute = new Hono<AppEnv>().post(
  "/bins/match-count",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const collectionGuid = c.req.query("collectionGuid") ?? "";
    const { rules } = await c.req.json<{ rules: BinRuleGroup }>();
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const collection = await findCardsCollection(tx, collectionGuid, orgId);
      if (!collection) {
        return { success: false, message: "Collection not found." };
      }
      const fields = (collection.fieldDefinitions ?? []) as FieldMeta[];
      const problems = validateBinRules(rules, fields);
      if (problems.length > 0) {
        return {
          success: false,
          message: `Invalid rules. ${problems.slice(0, 5).join(" ")}`,
        };
      }
      const cat = sql.raw(CARD_CATALOG_ALIAS);
      const rows = await tx.execute(sql`
        SELECT cc.card AS card, ${cat}.data AS raw
        FROM collection_cards cc
        ${cardCatalogJoinSql(collection, CC_ALIAS_SQL_COLUMNS)}
        WHERE cc.collection_id = ${collection.id}
        LIMIT ${MATCH_COUNT_CARD_LIMIT}
      `);
      const cards = (
        rows.rows as unknown as { card: SourceCard; raw: unknown }[]
      ).map((r) => ({ ...r.card, raw: r.raw ?? undefined }) as SourceCard);
      return {
        success: true,
        data: {
          matched: countMatchingCards(cards, rules, fields),
          total: cards.length,
        },
      };
    });
    return c.json(result);
  },
);
