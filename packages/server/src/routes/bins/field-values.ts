import {
  getCardValue,
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
import { MATCH_COUNT_CARD_LIMIT } from "./match-count";

export const FIELD_VALUES_LIMIT = 200;

export function distinctFieldValues(
  cards: SourceCard[],
  field: FieldMeta,
  fieldDefinitions: FieldMeta[],
): string[] {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const value = getCardValue(card, field.field, fieldDefinitions);
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) {
      if (item === null || item === undefined || item === "") continue;
      const key = String(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, FIELD_VALUES_LIMIT)
    .map(([key]) => key);
}

export const binFieldValuesRoute = new Hono<AppEnv>().get(
  "/bins/field-values",
  requireAuth,
  requireOrg,
  async (c) => {
    const orgId = c.get("orgId");
    const collectionGuid = c.req.query("collectionGuid") ?? "";
    const fieldKey = c.req.query("field") ?? "";
    const result = await authQuery(c.get("jwtClaims"), async (tx) => {
      const collection = await findCardsCollection(tx, collectionGuid, orgId);
      if (!collection) {
        return { success: false, message: "Collection not found." };
      }
      const fields = (collection.fieldDefinitions ?? []) as FieldMeta[];
      const meta = fields.find((f) => f.field === fieldKey);
      if (!meta) {
        return { success: false, message: "Unknown field." };
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
        data: { values: distinctFieldValues(cards, meta, fields) },
      };
    });
    return c.json(result);
  },
);
