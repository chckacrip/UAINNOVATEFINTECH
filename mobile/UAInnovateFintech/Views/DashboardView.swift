import SwiftUI
import Charts

private struct MonthBarPoint: Identifiable {
    let id: String
    let month: String
    let type: String
    let amount: Double
}

struct DashboardView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var transactions: [Transaction] = []
    @State private var profile: Profile?
    @State private var billReminders: [BillReminder] = []
    @State private var loading = true
    @State private var error: String?
    @State private var datePreset: DatePreset = .thisMonth

    enum DatePreset: String, CaseIterable {
        case thisMonth = "This month"
        case last30 = "Last 30 days"
        case last3Mo = "Last 3 months"
    }

    private var filteredTransactions: [Transaction] {
        let cal = Calendar.current
        let now = Date()
        switch datePreset {
        case .thisMonth:
            let ym = String(format: "%04d-%02d", cal.component(.year, from: now), cal.component(.month, from: now))
            return transactions.filter { String($0.posted_at.prefix(7)) == ym }
        case .last30:
            guard let start = cal.date(byAdding: .day, value: -30, to: now) else { return transactions }
            return transactions.filter { t in
                guard let d = date(from: t.posted_at) else { return false }
                return d >= start && d <= now
            }
        case .last3Mo:
            guard let start = cal.date(byAdding: .month, value: -3, to: now) else { return transactions }
            return transactions.filter { t in
                guard let d = date(from: t.posted_at) else { return false }
                return d >= start && d <= now
            }
        }
    }

    private var currentSummary: MonthlySummary {
        if datePreset == .thisMonth {
            let ym = String(format: "%04d-%02d", Calendar.current.component(.year, from: Date()), Calendar.current.component(.month, from: Date()))
            return DashboardHelper.computeMonthlySummary(transactions: transactions, yearMonth: ym)
        }
        var byCat: [String: Double] = [:]
        var inc: Double = 0, exp: Double = 0
        for t in filteredTransactions {
            let cat = t.category.isEmpty ? "Other" : t.category
            if t.amount > 0 { inc += t.amount; byCat[cat, default: 0] += t.amount }
            else { exp += abs(t.amount); byCat[cat, default: 0] += abs(t.amount) }
        }
        return MonthlySummary(month: datePreset.rawValue, total_income: inc, total_expenses: exp, net_cashflow: inc - exp, by_category: byCat)
    }

    private var months: [MonthlySummary] {
        DashboardHelper.monthlySummaries(transactions: transactions, count: 12)
    }

    private var recurring: [RecurringItem] {
        RecurringHelper.detectRecurring(transactions: transactions)
    }

    private var score: Int {
        DashboardHelper.financialScore(profileIncome: profile?.monthly_income ?? 0, totalExpenses: currentSummary.total_expenses, recentMonths: Array(months.suffix(3))).score
    }

    private var savingsRate: Int {
        DashboardHelper.financialScore(profileIncome: profile?.monthly_income ?? 0, totalExpenses: currentSummary.total_expenses, recentMonths: Array(months.suffix(3))).savingsRate
    }

    private var categoryData: [(name: String, value: Double)] {
        currentSummary.by_category
            .filter { $0.key != "Income" && $0.value > 0 }
            .sorted { $0.value > $1.value }
            .map { ($0.key, $0.value) }
    }

    private var topMerchants: [(name: String, total: Double)] {
        var map: [String: Double] = [:]
        for t in filteredTransactions where t.amount < 0 {
            let key = t.merchant.isEmpty ? t.description : t.merchant
            map[key, default: 0] += abs(t.amount)
        }
        return map.sorted { $0.value > $1.value }.prefix(8).map { ($0.key, $0.value) }
    }

    private var dueThisWeek: [(merchant: String, amount: Double)] {
        let cal = Calendar.current
        let now = Date()
        var result: [(String, Double)] = []
        for r in recurring {
            let lastTx = transactions.first { t in t.amount < 0 && (t.merchant.isEmpty ? t.description : t.merchant).lowercased() == r.merchant.lowercased() }
            guard let last = lastTx, let lastDate = date(from: last.posted_at) else { continue }
            var next = cal.date(byAdding: .day, value: r.frequency_days, to: lastDate) ?? lastDate
            let weekEnd = cal.date(byAdding: .day, value: 7, to: now) ?? now
            while next < now { next = cal.date(byAdding: .day, value: r.frequency_days, to: next) ?? next }
            if next <= weekEnd { result.append((r.merchant, r.avg_amount)) }
        }
        return result
    }

    private var weeklyCashFlow: (in: Double, out: Double) {
        let (start, end) = DashboardHelper.weekRange(around: Date())
        let inRange = transactions.filter { t in
            guard let d = date(from: t.posted_at) else { return false }
            return d >= start && d <= end && t.amount > 0
        }.reduce(0) { $0 + $1.amount }
        let outRange = transactions.filter { t in
            guard let d = date(from: t.posted_at) else { return false }
            return d >= start && d <= end && t.amount < 0
        }.reduce(0) { $0 + abs($1.amount) }
        return (inRange, outRange)
    }

    private var effectiveBudgets: [String: Double] {
        guard let budgets = profile?.budgets else { return [:] }
        return budgets
    }

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if let err = error {
                    Text(err)
                        .foregroundStyle(.red)
                        .padding()
                } else if transactions.isEmpty {
                    emptyState
                } else {
                    dashboardContent
                }
            }
            .navigationTitle("Dashboard")
            .refreshable { await load() }
            .task { await load() }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "tray")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text("No transactions yet")
                .font(.headline)
            Text("Upload statements or add transactions to see your dashboard.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var dashboardContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Picker("Period", selection: $datePreset) {
                    ForEach(DatePreset.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)

                summaryCards
                incomeVsExpensesChart
                spendingByCategoryChart
                budgetSection
                weeklySection
                dueThisWeekSection
                topMerchantsSection
                goalsSection
                recurringSection
            }
            .padding()
        }
    }

    private var summaryCards: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            card(title: "Income", value: currentSummary.total_income, color: .green)
            card(title: "Expenses", value: currentSummary.total_expenses, color: .red)
            card(title: "Net", value: currentSummary.net_cashflow, color: currentSummary.net_cashflow >= 0 ? .green : .red)
            VStack(alignment: .leading, spacing: 4) {
                Text("Score")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text("\(score)")
                    .font(.title2.bold())
                Text("Savings \(savingsRate)%")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
        }
    }

    private func card(title: String, value: Double, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("$\(value, specifier: "%.0f")")
                .font(.title2.bold())
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
    }

    private var incomeVsExpensesChart: some View {
        Group {
            Text("Income vs Expenses (12 months)")
                .font(.headline)
            Chart(months.flatMap { m -> [MonthBarPoint] in
                let short = String(m.month.suffix(2))
                return [
                    MonthBarPoint(id: "\(short)-income", month: short, type: "Income", amount: m.total_income),
                    MonthBarPoint(id: "\(short)-expenses", month: short, type: "Expenses", amount: m.total_expenses)
                ]
            }) { item in
                LineMark(
                    x: .value("Month", item.month),
                    y: .value("Amount", item.amount)
                )
                .foregroundStyle(by: .value("Type", item.type))
                .interpolationMethod(.catmullRom)
            }
            .chartLegend(position: .top)
            .chartXAxisLabel("Month")
            .chartYAxisLabel("$")
            .frame(height: 220)
        }
        .padding()
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
    }

    private var spendingByCategoryChart: some View {
        Group {
            Text("Spending by Category")
                .font(.headline)
            if categoryData.isEmpty {
                Text("No spending data for this period.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(height: 120)
            } else {
                Chart(Array(categoryData.prefix(10)), id: \.name) { item in
                    BarMark(
                        x: .value("Amount", item.1),
                        y: .value("Category", item.0.count > 12 ? String(item.0.prefix(12)) + "…" : item.0)
                    )
                    .foregroundStyle(by: .value("Cat", item.0))
                }
                .chartLegend(.hidden)
                .frame(height: min(280, CGFloat(categoryData.prefix(10).count) * 28))
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
    }

    private var budgetSection: some View {
        Group {
            if !effectiveBudgets.isEmpty {
                Text("Budget Progress")
                    .font(.headline)
                ForEach(Array(effectiveBudgets.keys.sorted()), id: \.self) { cat in
                    let limit = effectiveBudgets[cat] ?? 0
                    let spent = currentSummary.by_category[cat] ?? 0
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(cat)
                            Spacer()
                            Text("$\(spent, specifier: "%.0f") / $\(limit, specifier: "%.0f")")
                                .font(.caption)
                                .foregroundStyle(spent > limit ? .red : .secondary)
                        }
                        .font(.subheadline)
                        GeometryReader { g in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(Color(.tertiarySystemFill))
                                    .frame(height: 8)
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(spent > limit ? Color.red : Color.blue)
                                    .frame(width: min(1, limit > 0 ? spent / limit : 0) * g.size.width, height: 8)
                            }
                        }
                        .frame(height: 8)
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private var weeklySection: some View {
        Group {
            Text("This week")
                .font(.headline)
            HStack {
                Text("In")
                    .foregroundStyle(.secondary)
                Text("$\(weeklyCashFlow.in, specifier: "%.0f")")
                    .foregroundStyle(.green)
                    .fontWeight(.medium)
                Text("Out")
                    .foregroundStyle(.secondary)
                    .padding(.leading, 12)
                Text("$\(weeklyCashFlow.out, specifier: "%.0f")")
                    .foregroundStyle(.red)
                    .fontWeight(.medium)
            }
            .font(.subheadline)
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
        }
    }

    private var dueThisWeekSection: some View {
        Group {
            if !dueThisWeek.isEmpty {
                Text("Due this week")
                    .font(.headline)
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(dueThisWeek, id: \.merchant) { item in
                        HStack {
                            Text(item.merchant)
                                .lineLimit(1)
                            Spacer()
                            Text("$\(item.amount, specifier: "%.2f")")
                                .foregroundStyle(.secondary)
                        }
                        .font(.subheadline)
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private var topMerchantsSection: some View {
        Group {
            if !topMerchants.isEmpty {
                Text("Top merchants")
                    .font(.headline)
                let maxVal = topMerchants.first?.total ?? 1
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(topMerchants, id: \.name) { m in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(m.name)
                                    .lineLimit(1)
                                    .font(.subheadline)
                                Spacer()
                                Text("$\(m.total, specifier: "%.2f")")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            GeometryReader { g in
                                ZStack(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 4)
                                        .fill(Color(.tertiarySystemFill))
                                        .frame(height: 6)
                                    RoundedRectangle(cornerRadius: 4)
                                        .fill(Color.blue)
                                        .frame(width: (m.total / maxVal) * g.size.width, height: 6)
                                }
                            }
                            .frame(height: 6)
                        }
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private var goalsSection: some View {
        Group {
            if let goals = profile?.goals, !goals.isEmpty {
                Text("Goals")
                    .font(.headline)
                ForEach(goals.indices, id: \.self) { i in
                    let g = goals[i]
                    if g.target_amount > 0 {
                        HStack {
                            Text(g.name.isEmpty ? g.type : g.name)
                            Spacer()
                            Text("$\(g.saved ?? 0, specifier: "%.0f") / $\(g.target_amount, specifier: "%.0f")")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private var recurringSection: some View {
        Group {
            Text("Recurring (detected)")
                .font(.headline)
            if recurring.isEmpty {
                Text("No recurring subscriptions detected. Upload more data.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(recurring.prefix(10)) { r in
                        HStack {
                            Text(r.merchant)
                                .lineLimit(1)
                            Spacer()
                            Text("$\(r.avg_amount, specifier: "%.2f")")
                                .foregroundStyle(.secondary)
                            Text("~\(r.frequency_days)d")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .font(.subheadline)
                    }
                }
                .padding()
                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    private func date(from s: String) -> Date? {
        let pref = String(s.prefix(10))
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: pref)
    }

    private func load() async {
        guard let userId = supabase.session?.user.id.uuidString else { return }
        await MainActor.run { loading = true; error = nil }
        do {
            let tx = try await supabase.fetchTransactions(userId: userId)
            let pr = try await supabase.fetchProfile(userId: userId)
            let br = (try? await supabase.fetchBillReminders(userId: userId)) ?? []
            await MainActor.run {
                transactions = tx
                profile = pr
                billReminders = br
                loading = false
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                loading = false
            }
        }
    }
}
