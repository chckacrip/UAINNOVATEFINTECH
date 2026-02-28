import Foundation
import Supabase

@MainActor
final class SupabaseService: ObservableObject {
    static let shared = SupabaseService()

    let client: SupabaseClient
    @Published private(set) var session: Session?
    @Published var isLoggedIn: Bool = false

    private init() {
        client = SupabaseClient(
            supabaseURL: AppConfig.supabaseURL,
            supabaseKey: AppConfig.supabaseAnonKey
        )
        Task { await refreshSession() }
        Task { await observeAuth() }
    }

    func observeAuth() async {
        for await (_, session) in client.auth.authStateChanges {
            self.session = session
            self.isLoggedIn = session != nil
        }
    }

    func refreshSession() async {
        do {
            let session = try await client.auth.session
            await MainActor.run {
                self.session = session
                self.isLoggedIn = true
            }
        } catch {
            await MainActor.run {
                self.session = nil
                self.isLoggedIn = false
            }
        }
    }

    var accessToken: String? { session?.accessToken }

    func signIn(email: String, password: String) async throws {
        _ = try await client.auth.signIn(email: email, password: password)
        await refreshSession()
    }

    func signUp(email: String, password: String) async throws {
        _ = try await client.auth.signUp(email: email, password: password)
        await refreshSession()
    }

    func signOut() async throws {
        try await client.auth.signOut()
        await MainActor.run {
            session = nil
            isLoggedIn = false
        }
    }

    // MARK: - Data (mirrors web: direct Supabase access)

    func fetchTransactions(userId: String) async throws -> [Transaction] {
        let response: [Transaction] = try await client
            .from("transactions")
            .select()
            .eq("user_id", value: userId)
            .order("posted_at", ascending: false)
            .execute()
            .value
        return response
    }

    func fetchProfile(userId: String) async throws -> Profile? {
        let response: Profile? = try await client
            .from("profiles")
            .select()
            .eq("id", value: userId)
            .single()
            .execute()
            .value
        return response
    }

    func updateProfile(userId: String, _ updates: some Encodable) async throws {
        try await client
            .from("profiles")
            .update(updates)
            .eq("id", value: userId)
            .execute()
    }

    func insertTransaction(_ t: some Encodable) async throws {
        try await client.from("transactions").insert(t).execute()
    }

    func updateTransaction(id: String, _ updates: some Encodable) async throws {
        try await client.from("transactions").update(updates).eq("id", value: id).execute()
    }

    func deleteTransaction(id: String) async throws {
        try await client.from("transactions").delete().eq("id", value: id).execute()
    }

    func fetchBillReminders(userId: String) async throws -> [BillReminder] {
        let response: [BillReminder] = try await client
            .from("bill_reminders")
            .select()
            .eq("user_id", value: userId)
            .execute()
            .value
        return response
    }

    func deleteBillReminders(userId: String) async throws {
        try await client.from("bill_reminders").delete().eq("user_id", value: userId).execute()
    }

    func insertBillReminder(_ reminder: some Encodable) async throws {
        try await client.from("bill_reminders").insert(reminder).execute()
    }

    func fetchAssets(userId: String) async throws -> [Asset] {
        let response: [Asset] = try await client
            .from("assets")
            .select()
            .eq("user_id", value: userId)
            .order("value", ascending: false)
            .execute()
            .value
        return response
    }

    func fetchLiabilities(userId: String) async throws -> [Liability] {
        let response: [Liability] = try await client
            .from("liabilities")
            .select()
            .eq("user_id", value: userId)
            .order("balance", ascending: false)
            .execute()
            .value
        return response
    }

    func fetchNetWorthSnapshots(userId: String) async throws -> [NetWorthSnapshot] {
        let response: [NetWorthSnapshot] = try await client
            .from("net_worth_snapshots")
            .select()
            .eq("user_id", value: userId)
            .order("snapshot_month", ascending: false)
            .execute()
            .value
        return response
    }

    func insertAsset(_ asset: some Encodable) async throws {
        try await client.from("assets").insert(asset).execute()
    }

    func insertLiability(_ liability: some Encodable) async throws {
        try await client.from("liabilities").insert(liability).execute()
    }

    func deleteAsset(id: String) async throws {
        try await client.from("assets").delete().eq("id", value: id).execute()
    }

    func deleteLiability(id: String) async throws {
        try await client.from("liabilities").delete().eq("id", value: id).execute()
    }
}
