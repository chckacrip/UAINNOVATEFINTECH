import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            DashboardView()
                .tabItem { Label("Dashboard", systemImage: "chart.pie") }
            TransactionsView()
                .tabItem { Label("Transactions", systemImage: "list.bullet") }
            UploadView()
                .tabItem { Label("Upload", systemImage: "square.and.arrow.up") }
            MoreView()
                .tabItem { Label("More", systemImage: "ellipsis.circle") }
            ProfileView()
                .tabItem { Label("Profile", systemImage: "person.circle") }
        }
    }
}
