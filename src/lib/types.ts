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
  saved?: number; // manual "saved so far" amount
}

export interface RecurringIncomeItem {
  name: string;
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly";
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
  custom_categories?: string[];
  recurring_income?: RecurringIncomeItem[];
  merchant_rules?: MerchantRule[];
  budget_rollover?: Record<string, boolean>;
  filter_presets?: FilterPreset[];
  report_schedule?: ReportSchedule;
  net_worth_target_amount?: number;
  net_worth_target_date?: string;
  transaction_templates?: TransactionTemplate[];
  subscription_price_history?: Record<string, { date: string; amount: number }[]>;
  category_emoji?: Record<string, string>;
  dashboard_sections?: { order: string[]; collapsed: string[] };
  transaction_rules?: TransactionRule[];
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
  notes?: string;
  tags?: string[];
  splits?: { category: string; amount: number }[];
  account_id?: string;
  refund_of_id?: string;
  is_refund?: boolean;
  receipt_url?: string;
}

export interface TransactionTemplate {
  id: string;
  name: string;
  amount: number;
  merchant: string;
  category: string;
}

export interface TransactionRule {
  id: string;
  condition: { amountMin?: number; amountMax?: number; category?: string; merchantPattern?: string };
  action: { addTag?: string; setCategory?: string };
}

export interface BillReminder {
  id: string;
  user_id: string;
  name: string;
  due_day: number;
  amount?: number;
  currency?: string;
  category?: string;
  reminder_days_before: number;
  created_at?: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  tag?: string;
  search?: string;
}

export interface ReportSchedule {
  enabled: boolean;
  frequency: "weekly" | "monthly";
}

export interface MerchantRule {
  pattern: string;
  category: string;
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
