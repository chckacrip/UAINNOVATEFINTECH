import Foundation

enum AppConfig {
    private static let plist: [String: Any] = {
        guard let path = Bundle.main.path(forResource: "Config", ofType: "plist"),
              let dict = NSDictionary(contentsOfFile: path) as? [String: Any] else {
            return [:]
        }
        return dict
    }()

    static var backendBaseURL: URL {
        guard let raw = plist["BACKEND_BASE_URL"] as? String, !raw.isEmpty, let url = URL(string: raw) else {
            return URL(string: "https://main.d19vivzlve7dd.amplifyapp.com")!
        }
        return url
    }

    static var supabaseURL: URL {
        guard let raw = plist["SUPABASE_URL"] as? String, let url = URL(string: raw) else {
            fatalError("Set SUPABASE_URL in Config.plist")
        }
        return url
    }

    static var supabaseAnonKey: String {
        guard let key = plist["SUPABASE_ANON_KEY"] as? String, !key.isEmpty else {
            fatalError("Set SUPABASE_ANON_KEY in Config.plist")
        }
        return key
    }
}
