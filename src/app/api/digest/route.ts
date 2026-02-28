import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabase } from "@/lib/supabase/server";
import { buildDigestData, generateDigestEmail } from "@/lib/digest";
import { Transaction } from "@/lib/types";

// Triggered by cron (e.g., Supabase Edge Function, AWS EventBridge, or manual call)
// Expects a secret in the Authorization header or query param
export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.replace("Bearer ", "") || request.nextUrl.searchParams.get("secret");

  if (cronSecret && providedSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceSupabase();

  // Get all users with digest_enabled
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, monthly_income, digest_enabled")
    .eq("digest_enabled", true);

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ message: "No users with digest enabled", processed: 0 });
  }

  const results: { user_id: string; status: string }[] = [];

  for (const profile of profiles) {
    try {
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", profile.id)
        .order("posted_at", { ascending: false })
        .limit(500);

      if (!transactions || transactions.length === 0) {
        results.push({ user_id: profile.id, status: "skipped_no_transactions" });
        continue;
      }

      const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
      const email = authUser?.user?.email;
      if (!email) {
        results.push({ user_id: profile.id, status: "skipped_no_email" });
        continue;
      }

      const digestData = buildDigestData(
        transactions as Transaction[],
        profile.monthly_income || 0,
        email.split("@")[0]
      );

      if (!digestData) {
        results.push({ user_id: profile.id, status: "skipped_no_data" });
        continue;
      }

      const { subject, html } = await generateDigestEmail(digestData);

      // Send email — integrate with your provider (Resend, SendGrid, SES)
      // For now, log the email content. Replace with actual sending.
      const emailProvider = process.env.EMAIL_PROVIDER;

      if (emailProvider === "resend") {
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM || "FinanceCopilot <digest@financecopilot.app>",
              to: [email],
              subject,
              html,
            }),
          });
          results.push({ user_id: profile.id, status: "sent" });
        }
      } else {
        // No email provider configured; log for debugging
        console.log(`[Digest] Would send to ${email}: ${subject}`);
        results.push({ user_id: profile.id, status: "logged_no_provider" });
      }
    } catch (err) {
      results.push({ user_id: profile.id, status: `error: ${err instanceof Error ? err.message : "unknown"}` });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
