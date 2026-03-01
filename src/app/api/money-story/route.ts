import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/supabase/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { generateMoneyStoryThisWeek } from "@/lib/money-story";
import { detectRecurring } from "@/lib/summary";
import { Transaction, Goal } from "@/lib/types";

function getWeekRange(): { start: Date; end: Date; startStr: string; endStr: string } {
  const now = new Date();
  const day = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  return { start, end, startStr, endStr };
}

export async function POST(request: NextRequest) {
  const rateLimitRes = await rateLimit(request, "money-story", { max: 10 });
  if (rateLimitRes) return rateLimitRes;

  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;
  const { supabase, user } = auth;

  const [{ data: txData }, { data: profile }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("posted_at", { ascending: false })
      .limit(500),
    supabase
      .from("profiles")
      .select("monthly_income, goals")
      .eq("id", user.id)
      .single(),
  ]);

  const transactions = (txData as Transaction[]) ?? [];
  if (transactions.length === 0) {
    return NextResponse.json({
      story: "Upload some transactions to get your weekly money story.",
    });
  }

  const { startStr, endStr } = getWeekRange();
  const weekTx = transactions.filter(
    (t) => t.posted_at >= startStr && t.posted_at <= endStr
  );
  const weekIncome = weekTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const weekExpenses = weekTx.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const byCat: Record<string, number> = {};
  for (const t of weekTx) {
    if (t.amount >= 0) continue;
    const cat = t.category || "Other";
    byCat[cat] = (byCat[cat] || 0) + Math.abs(t.amount);
  }
  const topCategoriesThisWeek = Object.entries(byCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, amount }));

  const recurring = detectRecurring(transactions);
  const recurringMerchants = new Set(recurring.map((r) => r.merchant.toLowerCase()));
  const subscriptionsThisWeek = weekTx
    .filter((t) => {
      if (t.amount >= 0) return false;
      const key = (t.merchant || t.description).toLowerCase();
      return recurringMerchants.has(key) || (t.category || "").toLowerCase().includes("subscription");
    })
    .map((t) => ({
      name: t.merchant || t.description,
      amount: Math.abs(t.amount),
    }));

  const goals = (profile?.goals as Goal[] | undefined) ?? [];
  const goalsForStory = goals.map((g) => ({
    name: g.name || "Savings",
    target_amount: g.target_amount ?? 0,
    saved: g.saved ?? 0,
  }));

  try {
    const story = await generateMoneyStoryThisWeek({
      weekStart: startStr,
      weekEnd: endStr,
      weekIncome,
      weekExpenses,
      topCategoriesThisWeek,
      subscriptionsThisWeek,
      monthlyIncome: profile?.monthly_income ?? 0,
      goals: goalsForStory,
      netThisWeek: weekIncome - weekExpenses,
    });

    return NextResponse.json({ story });
  } catch (e) {
    console.error("[money-story]", e);
    return NextResponse.json(
      { error: "Could not generate your money story. Try again." },
      { status: 500 }
    );
  }
}
