import { Category, CATEGORIES } from "./types";
import OpenAI from "openai";

const MERCHANT_RULES: Record<string, { merchant: string; category: Category }> = {
  "walmart": { merchant: "Walmart", category: "Groceries" },
  "target": { merchant: "Target", category: "Shopping" },
  "amazon": { merchant: "Amazon", category: "Shopping" },
  "costco": { merchant: "Costco", category: "Groceries" },
  "kroger": { merchant: "Kroger", category: "Groceries" },
  "whole foods": { merchant: "Whole Foods", category: "Groceries" },
  "trader joe": { merchant: "Trader Joe's", category: "Groceries" },
  "safeway": { merchant: "Safeway", category: "Groceries" },
  "aldi": { merchant: "Aldi", category: "Groceries" },
  "uber eats": { merchant: "Uber Eats", category: "Dining" },
  "doordash": { merchant: "DoorDash", category: "Dining" },
  "grubhub": { merchant: "Grubhub", category: "Dining" },
  "starbucks": { merchant: "Starbucks", category: "Dining" },
  "mcdonald": { merchant: "McDonald's", category: "Dining" },
  "chipotle": { merchant: "Chipotle", category: "Dining" },
  "chick-fil-a": { merchant: "Chick-fil-A", category: "Dining" },
  "uber": { merchant: "Uber", category: "Transport" },
  "lyft": { merchant: "Lyft", category: "Transport" },
  "shell": { merchant: "Shell Gas", category: "Transport" },
  "chevron": { merchant: "Chevron", category: "Transport" },
  "exxon": { merchant: "Exxon", category: "Transport" },
  "bp ": { merchant: "BP Gas", category: "Transport" },
  "netflix": { merchant: "Netflix", category: "Subscriptions" },
  "spotify": { merchant: "Spotify", category: "Subscriptions" },
  "hulu": { merchant: "Hulu", category: "Subscriptions" },
  "disney+": { merchant: "Disney+", category: "Subscriptions" },
  "apple.com/bill": { merchant: "Apple", category: "Subscriptions" },
  "youtube premium": { merchant: "YouTube Premium", category: "Subscriptions" },
  "hbo max": { merchant: "HBO Max", category: "Subscriptions" },
  "gym": { merchant: "Gym", category: "Health" },
  "planet fitness": { merchant: "Planet Fitness", category: "Health" },
  "cvs": { merchant: "CVS Pharmacy", category: "Health" },
  "walgreens": { merchant: "Walgreens", category: "Health" },
  "comcast": { merchant: "Comcast", category: "Utilities" },
  "verizon": { merchant: "Verizon", category: "Utilities" },
  "at&t": { merchant: "AT&T", category: "Utilities" },
  "t-mobile": { merchant: "T-Mobile", category: "Utilities" },
  "electric": { merchant: "Electric Company", category: "Utilities" },
  "water bill": { merchant: "Water Company", category: "Utilities" },
  "rent": { merchant: "Rent", category: "Housing" },
  "mortgage": { merchant: "Mortgage", category: "Housing" },
  "airbnb": { merchant: "Airbnb", category: "Travel" },
  "airline": { merchant: "Airline", category: "Travel" },
  "hotel": { merchant: "Hotel", category: "Travel" },
  "united air": { merchant: "United Airlines", category: "Travel" },
  "delta air": { merchant: "Delta Airlines", category: "Travel" },
  "southwest": { merchant: "Southwest Airlines", category: "Travel" },
  "payroll": { merchant: "Payroll", category: "Income" },
  "direct dep": { merchant: "Direct Deposit", category: "Income" },
  "salary": { merchant: "Salary", category: "Income" },
  "deposit": { merchant: "Deposit", category: "Income" },
  "venmo": { merchant: "Venmo", category: "Other" },
  "zelle": { merchant: "Zelle", category: "Other" },
};

export function extractMerchant(description: string): string {
  const lower = description.toLowerCase().trim();
  for (const [keyword, rule] of Object.entries(MERCHANT_RULES)) {
    if (lower.includes(keyword)) {
      return rule.merchant;
    }
  }
  // Heuristic: take first 2-3 meaningful words, strip numbers and special chars
  const cleaned = description
    .replace(/[#*0-9]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 3)
    .join(" ");
  return cleaned || description.slice(0, 30);
}

export function categorizeLocal(description: string): Category | null {
  const lower = description.toLowerCase();
  for (const [keyword, rule] of Object.entries(MERCHANT_RULES)) {
    if (lower.includes(keyword)) {
      return rule.category;
    }
  }
  return null;
}

export async function categorizeWithAI(
  descriptions: string[]
): Promise<Category[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `Classify each transaction description into exactly one category.
Categories: ${CATEGORIES.join(", ")}

Descriptions:
${descriptions.map((d, i) => `${i + 1}. ${d}`).join("\n")}

Return a JSON array of category strings in the same order. Only return the JSON array, nothing else.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const text = response.choices[0]?.message?.content?.trim() ?? "[]";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned) as string[];
    return parsed.map((c) => {
      const match = CATEGORIES.find(
        (cat) => cat.toLowerCase() === c.toLowerCase()
      );
      return match ?? "Other";
    });
  } catch {
    return descriptions.map(() => "Other");
  }
}

export function applyUserMerchantRules(
  rows: { description: string }[],
  categories: string[],
  rules: { pattern: string; category: string }[]
): string[] {
  if (!rules?.length) return categories;
  return rows.map((row, i) => {
    const lower = row.description.toLowerCase();
    for (const rule of rules) {
      if (lower.includes(rule.pattern.toLowerCase())) return rule.category;
    }
    return categories[i] ?? "Other";
  });
}

export async function categorizeTransactions(
  rows: { description: string; amount: number }[]
): Promise<{ merchant: string; category: Category }[]> {
  const results: { merchant: string; category: Category }[] = [];
  const needsAI: { index: number; description: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const { description, amount } = rows[i];
    const merchant = extractMerchant(description);
    const localCat = categorizeLocal(description);

    if (amount > 0 && !categorizeLocal(description)) {
      results[i] = { merchant, category: "Income" };
    } else if (localCat) {
      results[i] = { merchant, category: localCat };
    } else {
      results[i] = { merchant, category: "Other" }; // placeholder
      needsAI.push({ index: i, description });
    }
  }

  if (needsAI.length > 0 && process.env.OPENAI_API_KEY) {
    const batchSize = 50;
    for (let i = 0; i < needsAI.length; i += batchSize) {
      const batch = needsAI.slice(i, i + batchSize);
      const categories = await categorizeWithAI(batch.map((b) => b.description));
      batch.forEach((item, idx) => {
        results[item.index].category = categories[idx] ?? "Other";
      });
    }
  }

  return results;
}
