import SwiftUI

struct NetWorthView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var assets: [Asset] = []
    @State private var liabilities: [Liability] = []
    @State private var loading = true
    @State private var newAssetName = ""
    @State private var newAssetValue = ""
    @State private var newLiabilityName = ""
    @State private var newLiabilityBalance = ""

    private var totalAssets: Double {
        assets.reduce(0) { $0 + $1.value }
    }

    private var totalLiabilities: Double {
        liabilities.reduce(0) { $0 + $1.balance }
    }

    private var netWorth: Double {
        totalAssets - totalLiabilities
    }

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Loading…")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        Section("Summary") {
                            HStack { Text("Assets"); Spacer(); Text("$\(totalAssets, specifier: "%.2f")").foregroundStyle(.green) }
                            HStack { Text("Liabilities"); Spacer(); Text("$\(totalLiabilities, specifier: "%.2f")").foregroundStyle(.red) }
                            HStack { Text("Net Worth"); Spacer(); Text("$\(netWorth, specifier: "%.2f")").font(.headline) }
                        }
                        Section("Assets") {
                            ForEach(assets) { a in
                                HStack {
                                    Text(a.name)
                                    Spacer()
                                    Text("$\(a.value, specifier: "%.2f")")
                                        .foregroundStyle(.secondary)
                                }
                            }
                            HStack {
                                TextField("Name", text: $newAssetName)
                                TextField("Value", text: $newAssetValue)
                                    .keyboardType(.decimalPad)
                                Button("Add") { Task { await addAsset() } }
                                    .disabled(newAssetName.isEmpty || Double(newAssetValue) == nil)
                            }
                        }
                        Section("Liabilities") {
                            ForEach(liabilities) { l in
                                HStack {
                                    Text(l.name)
                                    Spacer()
                                    Text("$\(l.balance, specifier: "%.2f")")
                                        .foregroundStyle(.secondary)
                                }
                            }
                            HStack {
                                TextField("Name", text: $newLiabilityName)
                                TextField("Balance", text: $newLiabilityBalance)
                                    .keyboardType(.decimalPad)
                                Button("Add") { Task { await addLiability() } }
                                    .disabled(newLiabilityName.isEmpty || Double(newLiabilityBalance) == nil)
                            }
                        }
                    }
                }
            }
            .navigationTitle("Net Worth")
            .task { await load() }
        }
    }

    private func load() async {
        guard let userId = supabase.session?.user.id.uuidString else { return }
        await MainActor.run { loading = true }
        do {
            let a = try await supabase.fetchAssets(userId: userId)
            let l = try await supabase.fetchLiabilities(userId: userId)
            await MainActor.run {
                assets = a
                liabilities = l
                loading = false
            }
        } catch {
            await MainActor.run { loading = false }
        }
    }

    private func addAsset() async {
        guard let userId = supabase.session?.user.id.uuidString,
              let value = Double(newAssetValue), value > 0 else { return }
        struct Payload: Encodable {
            let user_id: String
            let name: String
            let asset_type: String
            let value: Double
        }
        do {
            try await supabase.insertAsset(Payload(user_id: userId, name: newAssetName, asset_type: "savings", value: value))
            await MainActor.run { newAssetName = ""; newAssetValue = "" }
            await load()
        } catch {}
    }

    private func addLiability() async {
        guard let userId = supabase.session?.user.id.uuidString,
              let balance = Double(newLiabilityBalance), balance > 0 else { return }
        struct Payload: Encodable {
            let user_id: String
            let name: String
            let liability_type: String
            let balance: Double
            let interest_rate: Double
        }
        do {
            try await supabase.insertLiability(Payload(user_id: userId, name: newLiabilityName, liability_type: "credit_card", balance: balance, interest_rate: 0))
            await MainActor.run { newLiabilityName = ""; newLiabilityBalance = "" }
            await load()
        } catch {}
    }
}
