import SwiftUI

struct TaxView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var annualIncome = ""
    @State private var filingStatus = "single"
    @State private var stateCode = ""
    @State private var deductions = ""
    @State private var profile: Profile?
    @State private var ytdTaxDeductible: Double = 0

    private var estimate: TaxEstimator.Estimate? {
        guard let income = Double(annualIncome), income > 0 else { return nil }
        return TaxEstimator.estimate(
            annualIncome: income,
            filingStatus: filingStatus,
            stateCode: stateCode,
            additionalDeductions: Double(deductions) ?? 0
        )
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Your information") {
                    HStack {
                        Text("Annual income")
                        TextField("0", text: $annualIncome)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                    }
                    Picker("Filing status", selection: $filingStatus) {
                        Text("Single").tag("single")
                        Text("Married").tag("married")
                        Text("Head of household").tag("head_of_household")
                    }
                    HStack {
                        Text("State")
                        TextField("e.g. CA", text: $stateCode)
                            .textInputAutocapitalization(.characters)
                            .multilineTextAlignment(.trailing)
                    }
                    HStack {
                        Text("Extra deductions")
                        TextField("0", text: $deductions)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                    }
                }
                if ytdTaxDeductible > 0 {
                    Section("YTD tax-deductible (tagged)") {
                        Text("$\(ytdTaxDeductible, specifier: "%.2f")")
                            .font(.headline)
                            .foregroundStyle(.green)
                    }
                }
                if let e = estimate {
                    Section("Estimate") {
                        HStack { Text("Total tax"); Spacer(); Text("$\(e.total_tax, specifier: "%.0f")").font(.headline) }
                        HStack { Text("Effective rate"); Spacer(); Text("\(e.effective_rate, specifier: "%.1f")%") }
                        HStack { Text("Quarterly"); Spacer(); Text("$\(e.quarterly_payment, specifier: "%.0f")") }
                        HStack { Text("Monthly set-aside"); Spacer(); Text("$\(e.monthly_set_aside, specifier: "%.0f")") }
                        HStack { Text("Take-home"); Spacer(); Text("$\(e.gross_income - e.total_tax, specifier: "%.0f")").foregroundStyle(.green) }
                    }
                }
            }
            .navigationTitle("Tax")
            .task { await load() }
        }
    }

    private func load() async {
        guard let userId = supabase.session?.user.id.uuidString else { return }
        do {
            profile = try await supabase.fetchProfile(userId: userId)
            let txns = try await supabase.fetchTransactions(userId: userId)
            let year = String(Calendar.current.component(.year, from: Date()))
            ytdTaxDeductible = txns
                .filter { String($0.posted_at.prefix(4)) == year }
                .filter { ($0.tags ?? []).contains { $0.lowercased().contains("tax") } }
                .reduce(0) { $0 + abs($1.amount) }
        } catch {}
    }
}
