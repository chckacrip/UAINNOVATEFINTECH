import SwiftUI

struct CalendarView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var transactions: [Transaction] = []
    @State private var loading = true
    @State private var viewDate = Date()

    private var recurring: [RecurringItem] {
        RecurringHelper.detectRecurring(transactions: transactions)
    }

    private var billsByDay: [Int: [(merchant: String, amount: Double)]] {
        let cal = Calendar.current
        let year = cal.component(.year, from: viewDate)
        let month = cal.component(.month, from: viewDate)
        var map: [Int: [(merchant: String, amount: Double)]] = [:]
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        for r in recurring {
            let lastTx = transactions.first { t in
                t.amount < 0 && (t.merchant.isEmpty ? t.description : t.merchant).lowercased() == r.merchant.lowercased()
            }
            guard let last = lastTx, let lastDate = formatter.date(from: String(last.posted_at.prefix(10))) else { continue }
            var next = Calendar.current.date(byAdding: .day, value: r.frequency_days, to: lastDate) ?? lastDate
            guard let monthStart = Calendar.current.date(from: DateComponents(year: year, month: month, day: 1)) else { continue }
            while next < monthStart {
                next = Calendar.current.date(byAdding: .day, value: r.frequency_days, to: next) ?? next
            }
            if cal.component(.month, from: next) == month && cal.component(.year, from: next) == year {
                let day = cal.component(.day, from: next)
                map[day, default: []].append((r.merchant, r.avg_amount))
            }
        }
        for t in transactions where t.amount < 0 {
            let d = formatter.date(from: String(t.posted_at.prefix(10))) ?? Date()
            if cal.component(.month, from: d) == month && cal.component(.year, from: d) == year {
                let day = cal.component(.day, from: d)
                let name = t.merchant.isEmpty ? t.description : t.merchant
                if !(map[day] ?? []).contains(where: { $0.merchant.lowercased() == name.lowercased() }) {
                    map[day, default: []].append((name, abs(t.amount)))
                }
            }
        }
        return map
    }

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if transactions.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "calendar")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text("No transactions yet")
                            .font(.headline)
                        Text("Upload statements to see bills on the calendar.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 16) {
                            HStack {
                                Button { viewDate = Calendar.current.date(byAdding: .month, value: -1, to: viewDate) ?? viewDate } label: { Image(systemName: "chevron.left") }
                                Spacer()
                                Text(monthYear)
                                    .font(.headline)
                                Spacer()
                                Button { viewDate = Calendar.current.date(byAdding: .month, value: 1, to: viewDate) ?? viewDate } label: { Image(systemName: "chevron.right") }
                            }
                            .padding(.horizontal)

                            let days = daysInMonth()
                            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 8) {
                                ForEach(1...days, id: \.self) { day in
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("\(day)")
                                            .font(.caption.bold())
                                        ForEach(billsByDay[day] ?? [], id: \.merchant) { b in
                                            Text("\(b.merchant.prefix(8)) $\(b.amount, specifier: "%.0f")")
                                                .font(.caption2)
                                                .foregroundStyle(.secondary)
                                                .lineLimit(1)
                                        }
                                    }
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(6)
                                    .background(Color(.secondarySystemBackground))
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Bills")
            .task { await load() }
        }
    }

    private var monthYear: String {
        let f = DateFormatter()
        f.dateFormat = "MMMM yyyy"
        return f.string(from: viewDate)
    }

    private func daysInMonth() -> Int {
        let range = Calendar.current.range(of: .day, in: .month, for: viewDate)
        return range?.count ?? 30
    }

    private func load() async {
        guard let userId = supabase.session?.user.id.uuidString else { return }
        loading = true
        do {
            transactions = try await supabase.fetchTransactions(userId: userId)
        } catch {}
        loading = false
    }
}
