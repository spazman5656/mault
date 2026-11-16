import { createHmac, createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { getOwnAuth } from "../../auth/own-auth-instance";
import { db, pool } from "../../db";
import { platformUserRoles } from "../../db/schema";
import type { AppEnv } from "../../middleware/auth";
import { authErrorResponse } from "./shared";

// Homelab patch: sign-up is closed unless this is the first account, ALLOW_SIGNUP=true,
// or the caller holds a valid pending invite token issued for the same email.
async function hasValidInvite(email: string, inviteToken?: string): Promise<boolean> {
  if (!inviteToken) return false;
  const pepper = process.env.OWN_AUTH_TOKEN_PEPPER;
  const tokenHash = pepper
    ? createHmac("sha256", pepper).update(inviteToken).digest("hex")
    : createHash("sha256").update(inviteToken).digest("hex");
  const { rows } = await pool.query(
    `select 1 from own_auth_tokens
      where token_hash = $1 and type = 'organisation_invite'
        and used_at is null and expires_at > now()
        and lower(email) = lower($2)`,
    [tokenHash, email.trim()],
  );
  return rows.length > 0;
}

export const signUpRoute = new Hono<AppEnv>().post("/sign-up", async (c) => {
  const { email, password, name, inviteToken } = await c.req.json<{
    inviteToken?: string;
    email?: string;
    password?: string;
    name?: string;
  }>();
  if (!email || !password) {
    return c.json(
      { success: false, message: "Email and password are required." },
      400,
    );
  }

  const [{ count: existing }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(platformUserRoles);
  const open =
    Number(existing) === 0 ||
    process.env.ALLOW_SIGNUP === "true" ||
    (await hasValidInvite(email, inviteToken));
  if (!open) {
    return c.json(
      { success: false, message: "Sign-up is by invitation only." },
      403,
    );
  }

  try {
    const result = await getOwnAuth().signUpEmailPassword({
      email,
      password,
      name,
    });

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(platformUserRoles);
    if (Number(count) === 0) {
      await db
        .insert(platformUserRoles)
        .values({ userId: result.user.id, role: "admin" })
        .onConflictDoNothing();
    }

    return c.json({
      success: true,
      data: {
        token: result.sessionToken,
        user: { id: result.user.id, name: result.user.name, email },
      },
    });
  } catch (err) {
    const { message, status } = authErrorResponse(err);
    return c.json({ success: false, message }, status);
  }
});
