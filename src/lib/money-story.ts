import { getOpenAI } from "./openai";

export interface MoneyStoryInput {
  weekStart: string; // yyyy-mm-dd
  weekEnd: string;
  weekIncome: number;
  weekExpenses: number;
  topCategoriesThisWeek: { name: string; amount: number }[];
  subscriptionsThisWeek: { name: string; amount: number }[];
  monthlyIncome: number;
  goals: { name: string; target_amount: number; saved: number }[];
  netThisWeek: number;
}

export async function generateMoneyStoryThisWeek(input: MoneyStoryInput): Promise<string> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.5,
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content: `You write a single short paragraph (2-4 sentences) called "Your money story this week." 
Write in second person, friendly and conversational. Use the exact numbers provided.
Include: what came in and what went out this week; the top 1-2 spending categories if notable; any subscriptions that charged; and if they have goals, one line on progress (e.g. "You're X% of the way to your [goal name] goal" or "You're on track").
Do not use bullet points or JSON—output only the paragraph. Be specific with dollar amounts. Keep it under 80 words.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          week: `${input.weekStart} to ${input.weekEnd}`,
          week_income: input.weekIncome,
          week_expenses: input.weekExpenses,
          net_this_week: input.netThisWeek,
          top_categories: input.topCategoriesThisWeek.slice(0, 5),
          subscriptions_charged: input.subscriptionsThisWeek,
          monthly_income: input.monthlyIncome,
          goals: input.goals.filter((g) => g.target_amount > 0).map((g) => ({
            name: g.name || g.target_amount,
            target: g.target_amount,
            saved: g.saved ?? 0,
          })),
        }),
      },
    ],
  });

  const text = response.choices[0]?.message?.content?.trim() ?? "";
  return text || "This week you had no transaction activity to summarize.";
}
