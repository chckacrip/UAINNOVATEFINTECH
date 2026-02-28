import SwiftUI

struct ContentView: View {
    @EnvironmentObject var supabase: SupabaseService

    var body: some View {
        Group {
            if supabase.isLoggedIn {
                MainTabView()
            } else {
                LoginView()
            }
        }
        .task {
            await supabase.refreshSession()
        }
    }
}
