import Foundation

struct MonthlySummary: Identifiable {
    var id: String { month }
    var month: String
    var total_income: Double
    var total_expenses: Double
    var net_cashflow: Double
    var by_category: [String: Double]
}

enum DashboardHelper {
    private static let formatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM"
        return f
    }()

    static func computeMonthlySummary(transactions: [Transaction], yearMonth: String? = nil) -> MonthlySummary {
        let now = Date()
        let cal = Calendar.current
        let target: String
        if let ym = yearMonth {
            target = ym
        } else {
            let y = cal.component(.year, from: now)
            let m = cal.component(.month, from: now)
            target = String(format: "%04d-%02d", y, m)
        }

        let filtered = transactions.filter { String($0.posted_at.prefix(7)) == target }
        var byCategory: [String: Double] = [:]
        var totalIncome: Double = 0
        var totalExpenses: Double = 0

        for t in filtered {
            let cat = t.category.isEmpty ? "Other" : t.category
            if t.amount > 0 {
                totalIncome += t.amount
                byCategory[cat, default: 0] += t.amount
            } else {
                totalExpenses += abs(t.amount)
                byCategory[cat, default: 0] += abs(t.amount)
            }
        }

        return MonthlySummary(
            month: target,
            total_income: totalIncome,
            total_expenses: totalExpenses,
            net_cashflow: totalIncome - totalExpenses,
            by_category: byCategory
        )
    }

    static func monthlySummaries(transactions: [Transaction], count: Int = 12) -> [MonthlySummary] {
        let cal = Calendar.current
        var result: [MonthlySummary] = []
        var date = Date()
        for _ in 0..<count {
            let y = cal.component(.year, from: date)
            let m = cal.component(.month, from: date)
            let ym = String(format: "%04d-%02d", y, m)
            result.append(computeMonthlySummary(transactions: transactions, yearMonth: ym))
            date = cal.date(byAdding: .month, value: -1, to: date) ?? date
        }
        return result.reversed()
    }

    static func financialScore(profileIncome: Double, totalExpenses: Double, recentMonths: [MonthlySummary]) -> (score: Int, savingsRate: Int) {
        var monthlyIncome = profileIncome
        if monthlyIncome <= 0 {
            let withIncome = recentMonths.filter { $0.total_income > 0 }
            if !withIncome.isEmpty {
                monthlyIncome = withIncome.map(\.total_income).reduce(0, +) / Double(withIncome.count)
            }
        }
        let withExp = recentMonths.filter { $0.total_expenses > 0 }
        let avgExpenses = withExp.isEmpty ? totalExpenses : withExp.map(\.total_expenses).reduce(0, +) / Double(withExp.count)
        let savingsRate = monthlyIncome > 0 ? (monthlyIncome - avgExpenses) / monthlyIncome : 0
        let savingsScore = min(40, max(0, savingsRate * 200))

        var volatilityScore: Double = 30
        if withExp.count >= 2 {
            let mean = withExp.map(\.total_expenses).reduce(0, +) / Double(withExp.count)
            let variance = withExp.map { pow($0.total_expenses - mean, 2) }.reduce(0, +) / Double(withExp.count)
            let cv = mean > 0 ? sqrt(variance) / mean : 0
            volatilityScore = max(0, 30 - cv * 100)
        }

        let monthlySavings = monthlyIncome - avgExpenses
        let runway = avgExpenses > 0 ? (monthlySavings * 6) / avgExpenses : 0
        let runwayScore = min(30, max(0, runway * 10))

        let score = Int(min(100, max(0, savingsScore + volatilityScore + runwayScore)))
        return (score, Int(round(savingsRate * 100)))
    }

    static func weekRange(around date: Date) -> (start: Date, end: Date) {
        let cal = Calendar.current
        let start = cal.date(from: cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)) ?? date
        let end = cal.date(byAdding: .day, value: 6, to: start) ?? start
        return (start, end)
    }
}
