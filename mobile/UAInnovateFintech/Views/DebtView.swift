import SwiftUI

struct DebtView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var liabilities: [Liability] = []
    @State private var loading = true
    @State private var strategy: String = "avalanche" // avalanche = highest rate first, snowball = smallest balance first

    private var ordered: [Liability] {
        if strategy == "snowball" {
            return liabilities.sorted { $0.balance < $1.balance }
        }
        return liabilities.sorted { $0.interest_rate > $1.interest_rate }
    }

    private var totalDebt: Double {
        liabilities.reduce(0) { $0 + $1.balance }
    }

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if liabilities.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "creditcard")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text("No debts yet")
                            .font(.headline)
                        Text("Add liabilities in Net Worth to see payoff plans.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        Section("Strategy") {
                            Picker("", selection: $strategy) {
                                Text("Avalanche (highest rate)").tag("avalanche")
                                Text("Snowball (smallest balance)").tag("snowball")
                            }
                            .pickerStyle(.segmented)
                        }
                        Section("Total debt") {
                            Text("$\(totalDebt, specifier: "%.2f")")
                                .font(.title2.bold())
                        }
                        Section("Payoff order") {
                            ForEach(Array(ordered.enumerated()), id: \.element.id) { i, l in
                                HStack {
                                    Text("\(i + 1).")
                                        .foregroundStyle(.secondary)
                                    Text(l.name)
                                    Spacer()
                                    Text("$\(l.balance, specifier: "%.2f")")
                                        .foregroundStyle(.secondary)
                                    if l.interest_rate > 0 {
                                        Text("\(l.interest_rate, specifier: "%.1f")%")
                                            .font(.caption)
                                            .foregroundStyle(.orange)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Debt")
            .task { await load() }
        }
    }

    private func load() async {
        guard let userId = supabase.session?.user.id.uuidString else { return }
        loading = true
        do {
            liabilities = try await supabase.fetchLiabilities(userId: userId)
        } catch {}
        loading = false
    }
}
