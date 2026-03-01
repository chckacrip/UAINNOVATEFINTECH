import SwiftUI

@main
struct UAInnovateFintechApp: App {
    @StateObject private var supabase = SupabaseService.shared
    @AppStorage("appearance") private var appearanceRaw = AppearanceOption.system.rawValue

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(supabase)
                .preferredColorScheme(appearanceColorScheme)
        }
    }

    private var appearanceColorScheme: ColorScheme? {
        switch appearanceRaw {
        case AppearanceOption.light.rawValue: return .light
        case AppearanceOption.dark.rawValue: return .dark
        default: return nil
        }
    }
}
