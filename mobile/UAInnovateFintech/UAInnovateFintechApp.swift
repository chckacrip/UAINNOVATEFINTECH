import SwiftUI

@main
struct UAInnovateFintechApp: App {
    @StateObject private var supabase = SupabaseService.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(supabase)
        }
    }
}
