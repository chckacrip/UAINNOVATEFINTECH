export const GOAL_TYPES = [
  { value: "house", label: "Buy a House", icon: "🏠" },
  { value: "retirement", label: "Retirement", icon: "🏖️" },
  { value: "vacation", label: "Vacation", icon: "✈️" },
  { value: "car", label: "Buy a Car", icon: "🚗" },
  { value: "emergency", label: "Emergency Fund", icon: "🛟" },
  { value: "education", label: "Education", icon: "🎓" },
  { value: "debt", label: "Pay Off Debt", icon: "💳" },
  { value: "wedding", label: "Wedding", icon: "💍" },
  { value: "investment", label: "Investment", icon: "📈" },
  { value: "other", label: "Other", icon: "🎯" },
] as const;

export type GoalType = (typeof GOAL_TYPES)[number]["value"];

export interface Goal {
  type: GoalType;
  name: string;
  target_amount: number;
  target_date: string;
}

export interface Profile {
  id: string;
  monthly_income: number;
  fixed_costs: number;
  goals: Goal[];
  job_title: string;
  employer: string;
  industry: string;
  employment_type: string;
  city: string;
  state: string;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

export const INDUSTRIES = [
  "Technology",
  "Finance & Banking",
  "Healthcare",
  "Education",
  "Government",
  "Retail & E-Commerce",
  "Real Estate",
  "Manufacturing",
  "Consulting",
  "Legal",
  "Media & Entertainment",
  "Hospitality & Food Service",
  "Construction",
  "Energy",
  "Non-Profit",
  "Other",
] as const;

export const EMPLOYMENT_TYPES = [
  "full-time",
  "part-time",
  "contract",
  "freelance",
  "self-employed",
  "student",
  "retired",
  "unemployed",
] as const;

export interface Transaction {
  id: string;
  user_id: string;
  posted_at: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  merchant: string;
  source_file: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: AnalystResponse;
  created_at: string;
}

export interface AnalystResponse {
  insights: string[];
  risks: string[];
  recommended_actions: { action: string; estimated_monthly_impact: number }[];
  explanation: string;
}

export interface MonthlySummary {
  month: string;
  total_income: number;
  total_expenses: number;
  net_cashflow: number;
  by_category: Record<string, number>;
}

export interface RecurringItem {
  merchant: string;
  avg_amount: number;
  frequency_days: number;
  occurrences: number;
  category: string;
}

export const CATEGORIES = [
  "Housing",
  "Utilities",
  "Groceries",
  "Dining",
  "Transport",
  "Shopping",
  "Subscriptions",
  "Health",
  "Entertainment",
  "Travel",
  "Debt",
  "Income",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
