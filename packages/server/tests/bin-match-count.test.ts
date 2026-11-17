import assert from "node:assert/strict";
import { test } from "node:test";
import type { FieldMeta, SourceCard } from "@magic-vault/shared";
import { countMatchingCards } from "../src/routes/bins/match-count";

const fields: FieldMeta[] = [
  { field: "type_line", label: "Type Line", type: "string", path: "type_line", operators: [] },
];
const rules = (value: string) => ({
  id: "g",
  combinator: "and" as const,
  conditions: [
    { id: "c", field: "type_line", operator: "contains" as const, value },
  ],
});
const card = (type_line: string) =>
  ({ name: "x", raw: { type_line } }) as unknown as SourceCard;

test("counts cards whose raw type line matches", () => {
  const cards = [card("Basic Land — Forest"), card("Creature — Elf"), card("Land")];
  assert.equal(countMatchingCards(cards, rules("Land"), fields), 2);
});

test("empty rules match nothing", () => {
  const empty = { id: "g", combinator: "and" as const, conditions: [] };
  assert.equal(countMatchingCards([card("Land")], empty, fields), 0);
});
