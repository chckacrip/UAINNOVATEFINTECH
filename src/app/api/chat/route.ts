import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/supabase/api-auth";
import { buildChatContext } from "@/lib/chat-context";
import { analyzeFinances } from "@/lib/openai";
import { Transaction } from "@/lib/types";
import { getHCOLAnalysis } from "@/lib/hcol";
import { rateLimit } from "@/lib/rate-limit";
import { logApiError } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, "chat", { max: 30 });
  if (rateLimitRes) return rateLimitRes;

  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  let body: { question?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { question } = body;
  if (!question || typeof question !== "string") {
    return NextResponse.json(
      { error: "Question is required" },
      { status: 400 }
    );
  }

  // Why: no date filter in the query — we fetch up to 2000 rows
  // and filter in-memory relative to the newest transaction.
  // This avoids clock-skew issues between Lambda and the DB.
  const [{ data: allTransactions }, { data: profile }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("posted_at", { ascending: false })
      .limit(2000),
    supabase
      .from("profiles")
      .select("monthly_income, fixed_costs, goals, job_title, employer, industry, employment_type, city, state")
      .eq("id", user.id)
      .single(),
  ]);

  const transactions = (() => {
    if (!allTransactions || allTransactions.length === 0) return null;
    const newest = new Date(allTransactions[0].posted_at);
    const cutoff = new Date(newest);
    cutoff.setMonth(cutoff.getMonth() - 3);
    return allTransactions.filter(
      (t) => new Date(t.posted_at) >= cutoff
    );
  })();

  if (!transactions || transactions.length === 0) {
    return NextResponse.json({
      response: {
        insights: [],
        risks: [],
        recommended_actions: [],
        explanation: "I don't have any transaction data to analyze yet. Please upload your bank statements first!",
      },
    });
  }

  const context = buildChatContext(transactions as Transaction[], question);

  const hcolData = profile?.city && profile?.state
    ? getHCOLAnalysis(profile.city, profile.state, profile.monthly_income ?? 0)
    : null;

  const fullContext = {
    ...context,
    profile: {
      monthly_income: profile?.monthly_income ?? 0,
      fixed_costs: profile?.fixed_costs ?? 0,
      goals: profile?.goals ?? [],
      job: {
        title: profile?.job_title ?? null,
        employer: profile?.employer ?? null,
        industry: profile?.industry ?? null,
        employment_type: profile?.employment_type ?? "full-time",
      },
      location: {
        city: profile?.city ?? null,
        state: profile?.state ?? null,
        cost_of_living: hcolData ? {
          index: hcolData.index,
          label: hcolData.label,
          recommended_housing_budget: hcolData.recommended_housing_budget,
          recommended_savings_rate: hcolData.recommended_savings_rate,
          purchasing_power_per_100: hcolData.adjusted_purchasing_power,
        } : null,
      },
    },
  };

  const contextJson = JSON.stringify(fullContext, null, 2);

  let response;
  try {
    response = await analyzeFinances(contextJson, question);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logApiError("chat", message, { userId: user.id });
    return NextResponse.json(
      { error: message || "Analysis failed. Check server logs and OPENAI_API_KEY." },
      { status: 500 }
    );
  }

  // Fire-and-forget: store chat history (non-critical, don't block response)
  supabase.from("chat_messages").insert([
    { user_id: user.id, role: "user", content: question },
    { user_id: user.id, role: "assistant", content: response.explanation, metadata: response },
  ]).then(() => {});

  return NextResponse.json({ response });
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(100);

  return NextResponse.json({ messages: messages ?? [] });
}
