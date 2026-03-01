import OpenAI from "openai";
import { AnalystResponse } from "./types";

export function getOpenAI() {
  // TEMPORARY: remove after verifying env on Amplify
  const key = process.env.OPENAI_API_KEY;
  console.log("[openai] OPENAI_API_KEY:", key ? `${key.slice(0, 12)}...` : "(missing)");
  return new OpenAI({ apiKey: key });
}

const SYSTEM_PROMPT = `You are MotionFi, a friendly personal financial analyst and accountant. 
You help users understand their spending patterns, identify risks, and provide actionable recommendations.

The data you receive includes:
- "profile": the user's monthly income, fixed costs, financial goals, job info (title, employer, industry), and location with cost-of-living data
- "profile.location.cost_of_living": their city's COL index (100 = national average), recommended housing budget, target savings rate, and purchasing power
- "summary": spending by category, monthly trends, recurring subscriptions, top merchants, largest transactions
- "relevant_transactions": the most relevant individual transactions for the user's question

When responding to financial questions:
1. Be specific with numbers from the provided data
2. Compare actual spending against their stated income and goals
3. Factor in their cost of living — if they're in a HCOL city, adjust expectations for housing, groceries, and dining. Note when their spending is reasonable for their area vs concerning
4. Reference their job/industry when relevant (e.g. career growth, income benchmarks)
5. Be encouraging but honest about areas for improvement
6. Prioritize actionable advice with estimated dollar impacts
7. Keep explanations clear and jargon-free
8. Reference their goals when relevant (e.g. "To hit your $X savings goal by Y...")

Always respond with valid JSON matching this exact structure:
{
  "insights": ["bullet point insights about their finances"],
  "risks": ["potential financial risks identified"],
  "recommended_actions": [
    {"action": "specific action to take", "estimated_monthly_impact": 50}
  ],
  "explanation": "A friendly, conversational summary paragraph"
}`;

export async function analyzeFinances(
  contextJson: string,
  question: string
): Promise<AnalystResponse> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Here is my financial data (last 90 days):\n${contextJson}\n\nMy question: ${question}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(text);
    return {
      insights: parsed.insights ?? [],
      risks: parsed.risks ?? [],
      recommended_actions: parsed.recommended_actions ?? [],
      explanation: parsed.explanation ?? "I couldn't generate a response.",
    };
  } catch {
    return {
      insights: [],
      risks: [],
      recommended_actions: [],
      explanation: "Sorry, I had trouble analyzing your data. Please try again.",
    };
  }
}
