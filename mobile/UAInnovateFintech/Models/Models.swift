import Foundation

struct Transaction: Codable, Identifiable {
    let id: String
    let user_id: String
    let posted_at: String
    let description: String
    let amount: Double
    let currency: String
    let category: String
    let merchant: String
    let source_file: String?
    let created_at: String?
    var notes: String?
    var tags: [String]?
    var splits: [[String: Double]]?
    var account_id: String?
    var receipt_url: String?
}

struct Profile: Codable {
    var monthly_income: Double?
    var fixed_costs: Double?
    var goals: [Goal]?
    var budgets: [String: Double]?
    var job_title: String?
    var employer: String?
    var industry: String?
    var employment_type: String?
    var city: String?
    var state: String?
    var onboarded: Bool?
    var custom_categories: [String]?
    var recurring_income: [RecurringIncomeItem]?
    var budget_rollover: [String: Bool]?
    var subscription_notes: [String: String]?
    var subscription_price_history: [String: [PriceHistoryEntry]]?
    var net_worth_target_amount: Double?
    var net_worth_target_date: String?
    var digest_enabled: Bool?
    var report_schedule: ReportSchedule?
    var merchant_rules: [MerchantRule]?
}

struct ReportSchedule: Codable {
    var enabled: Bool
    var frequency: String
}

struct MerchantRule: Codable {
    var pattern: String
    var category: String
}

struct PriceHistoryEntry: Codable {
    let date: String
    let amount: Double
}

struct Goal: Codable {
    var type: String
    var name: String
    var target_amount: Double
    var target_date: String
    var saved: Double?
}

struct RecurringIncomeItem: Codable {
    var name: String
    var amount: Double
    var frequency: String
}

struct BillReminder: Codable, Identifiable {
    let id: String
    let user_id: String
    let name: String
    let due_day: Int
    let amount: Double?
    let currency: String?
    let category: String?
    let reminder_days_before: Int
}

struct HouseholdMembership: Codable, Identifiable {
    let id: String
    let household_id: String
    let email: String?
    let user_id: String?
    let role: String
    let status: String
    var households: Household?
}

struct Household: Codable {
    let id: String
    let name: String
}

// API response types
struct UploadResponse: Codable {
    let success: Bool
    let inserted: Int
    let errors: [String]?
}

struct HouseholdResponse: Codable {
    let memberships: [HouseholdMembership]?
    let household: Household?
    let error: String?
}

struct ChatRequest: Codable {
    let question: String
}

struct ChatResponse: Codable {
    let answer: String?
    let error: String?
}

struct ChatPostResponse: Codable {
    let response: AnalystResponse?
}

struct RecommendedAction: Codable {
    let action: String
    let estimated_monthly_impact: Double?
}

struct AnalystResponse: Codable {
    let explanation: String?
    let insights: [String]?
    let risks: [String]?
    let recommended_actions: [RecommendedAction]?
}

struct ChatMessage: Codable, Identifiable {
    let id: String
    let user_id: String?
    let role: String
    let content: String
    let metadata: AnalystResponse?
    let created_at: String?
}

struct Asset: Codable, Identifiable {
    let id: String
    let user_id: String
    let name: String
    let asset_type: String
    let value: Double
}

struct Liability: Codable, Identifiable {
    let id: String
    let user_id: String
    let name: String
    let liability_type: String
    let balance: Double
    let interest_rate: Double
    let minimum_payment: Double?
}

struct NetWorthSnapshot: Codable, Identifiable {
    let id: String
    let user_id: String
    let snapshot_month: String
    let assets_total: Double
    let liabilities_total: Double
}

struct RecurringItem: Identifiable {
    let merchant: String
    let avg_amount: Double
    let frequency_days: Int
    let occurrences: Int
    let category: String
    var id: String { merchant }
}
