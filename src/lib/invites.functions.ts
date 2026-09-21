import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

const tokenSchema = z.object({ token: z.string().min(8).max(200) });

/** Validates an invite link by its exact token. Returns only the associated e-mail. */
export const validateInvite = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("invites")
      .select("email,used_at,expires_at,sdr_key")
      .eq("token", data.token)
      .maybeSingle();
    if (!row || row.used_at || new Date(row.expires_at) < new Date()) {
      return { valid: false as const, email: null, sdrKey: null };
    }
    return { valid: true as const, email: row.email, sdrKey: row.sdr_key ?? null };
  });

/** Marks an invite as used. Requires the exact token; binds to the caller when signed in. */
export const consumeInvite = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let userId: string | null = null;
    const authHeader = getRequest()?.headers?.get("authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      userId = userData?.user?.id ?? null;
    }

    const { data: invite, error } = await supabaseAdmin
      .from("invites")
      .update({ used_at: new Date().toISOString(), used_by: userId })
      .eq("token", data.token)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .select("sdr_key,sdr_only,email")
      .maybeSingle();

    if (error || !invite) return { ok: false as const };

    // Fallback: quando o cadastro exige confirmação, o convite ainda não tem sessão.
    if (!userId && invite.email) {
      const { data: found } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", invite.email)
        .maybeSingle();
      userId = found?.id ?? null;
    }

    if (userId && invite.sdr_key) {
      await supabaseAdmin
        .from("sdr_assignments")
        .upsert({ user_id: userId, sdr_key: invite.sdr_key }, { onConflict: "user_id" });
      await supabaseAdmin.from("profiles").update({ status: "approved" }).eq("id", userId);
      if (invite.sdr_only) {
        await supabaseAdmin.from("user_panel_permissions").delete().eq("user_id", userId);
      }
    }

    return { ok: true as const };
  });

