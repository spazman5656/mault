import assert from "node:assert/strict";
import { test } from "node:test";
import type { FieldMeta, SourceCard } from "@magic-vault/shared";
import { distinctFieldValues } from "../src/routes/bins/field-values";

const typeLine: FieldMeta = {
  field: "type_line",
  label: "Type Line",
  type: "string",
  path: "type_line",
  operators: [],
};
const fields = [typeLine];
const card = (type_line?: string) =>
  ({ name: "x", raw: type_line === undefined ? {} : { type_line } }) as unknown as SourceCard;

test("returns distinct values, most common first, skipping blanks", () => {
  const cards = [card("Land"), card("Creature"), card("Land"), card("")];
  assert.deepEqual(distinctFieldValues(cards, typeLine, fields), ["Land", "Creature"]);
});

test("cards without the field add nothing", () => {
  assert.deepEqual(distinctFieldValues([card()], typeLine, fields), []);
});
