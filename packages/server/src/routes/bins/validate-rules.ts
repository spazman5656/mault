import {
  SCAN_RULE_FIELDS,
  type BinRuleGroup,
  type ConditionOperator,
  type FieldMeta,
} from "@magic-vault/shared";
import { z } from "zod";

const LIST_OPERATORS: ConditionOperator[] = [
  "in",
  "not_in",
  "contains_any",
  "contains_all",
  "contains_none",
];
const NUMBER_OPERATORS: ConditionOperator[] = [
  "gt",
  "gte",
  "lt",
  "lte",
  "count_equals",
  "count_gt",
  "count_lt",
];
const NO_VALUE_OPERATORS: ConditionOperator[] = ["is_null", "is_not_null"];

const OPERATORS = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  ...NUMBER_OPERATORS,
  ...LIST_OPERATORS,
  ...NO_VALUE_OPERATORS,
] as [ConditionOperator, ...ConditionOperator[]];

const conditionSchema = z.object({
  id: z.string(),
  field: z.string().min(1, "Condition needs a field."),
  operator: z.enum(OPERATORS),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

const ruleGroupSchema: z.ZodType<BinRuleGroup> = z.lazy(() =>
  z.object({
    id: z.string(),
    combinator: z.enum(["and", "or"]),
    conditions: z.array(z.union([conditionSchema, ruleGroupSchema])),
  }),
);

function isNumeric(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  return (
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  );
}

function checkGroup(
  group: BinRuleGroup,
  known: Set<string> | null,
  path: string,
  errors: string[],
): void {
  group.conditions.forEach((item, i) => {
    const where = `${path}[${i + 1}]`;
    if ("combinator" in item) {
      checkGroup(item, known, where, errors);
      return;
    }
    const { field, operator, value } = item;
    if (known && !known.has(field)) {
      errors.push(`Rule ${where}: unknown field "${field}".`);
    }
    if (NO_VALUE_OPERATORS.includes(operator)) return;
    if (LIST_OPERATORS.includes(operator)) {
      if (!Array.isArray(value)) {
        errors.push(`Rule ${where}: "${operator}" needs a list of values.`);
      }
    } else if (NUMBER_OPERATORS.includes(operator)) {
      if (!isNumeric(value)) {
        errors.push(`Rule ${where}: "${operator}" needs a number.`);
      }
    } else if (Array.isArray(value)) {
      errors.push(`Rule ${where}: "${operator}" needs a single value.`);
    }
  });
}

/** Returns a list of problems, empty when the rules are valid. */
export function validateBinRules(
  rules: unknown,
  fieldDefinitions: FieldMeta[] | null,
): string[] {
  const parsed = ruleGroupSchema.safeParse(rules);
  if (!parsed.success) {
    return parsed.error.issues.map(
      (issue) => `Rules ${issue.path.join(".") || "payload"}: ${issue.message}`,
    );
  }
  const known = fieldDefinitions
    ? new Set([...fieldDefinitions.map((f) => f.field), ...SCAN_RULE_FIELDS])
    : null;
  const errors: string[] = [];
  checkGroup(parsed.data, known, "", errors);
  return errors;
}
