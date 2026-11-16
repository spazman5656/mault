import assert from "node:assert/strict";
import { test } from "node:test";
import { SCAN_RULE_FIELDS, type FieldMeta } from "@magic-vault/shared";
import { validateBinRules } from "../src/routes/bins/validate-rules";

const fields: FieldMeta[] = [
  { field: "type_line", label: "Type Line", type: "string", path: "type_line", operators: [] },
  { field: "price", label: "Price", type: "numeric", path: "prices.usd", operators: [] },
];
const group = (conditions: unknown[]) => ({
  id: "g",
  combinator: "and",
  conditions,
});
const cond = (field: string, operator: string, value: unknown) => ({
  id: "c",
  field,
  operator,
  value,
});

test("accepts a valid rule", () => {
  assert.deepEqual(
    validateBinRules(group([cond("type_line", "contains", "Land")]), fields),
    [],
  );
});

test("accepts empty rules and nested groups", () => {
  assert.deepEqual(validateBinRules(group([]), fields), []);
  assert.deepEqual(
    validateBinRules(group([group([cond("price", "gt", "2")])]), fields),
    [],
  );
});

test("rejects unknown field, accepts scan fields", () => {
  assert.equal(
    validateBinRules(group([cond("nope", "equals", "x")]), fields).length,
    1,
  );
  assert.deepEqual(
    validateBinRules(group([cond(SCAN_RULE_FIELDS[0], "equals", "x")]), fields),
    [],
  );
});

test("rejects unknown operator and bad value types", () => {
  assert.ok(validateBinRules(group([cond("price", "bogus", 1)]), fields).length);
  assert.ok(validateBinRules(group([cond("price", "gt", "abc")]), fields).length);
  assert.ok(validateBinRules(group([cond("type_line", "in", "Land")]), fields).length);
  assert.ok(validateBinRules(group([cond("type_line", "equals", ["a"])]), fields).length);
});

test("is_null ignores value; no field list skips field check", () => {
  assert.deepEqual(validateBinRules(group([cond("price", "is_null", "")]), fields), []);
  assert.deepEqual(validateBinRules(group([cond("whatever", "equals", "x")]), null), []);
});

test("rejects malformed payload", () => {
  assert.ok(validateBinRules({ nope: 1 }, fields).length);
  assert.ok(validateBinRules(undefined, fields).length);
});
