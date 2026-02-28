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
