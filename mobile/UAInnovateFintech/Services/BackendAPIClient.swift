import Foundation

/// Calls the Next.js backend API with Bearer token (Supabase access_token).
final class BackendAPIClient {
    static let shared = BackendAPIClient()
    private let baseURL = AppConfig.backendBaseURL

    private init() {}

    func request<T: Decodable>(
        path: String,
        method: String = "GET",
        body: Data? = nil,
        formData: (key: String, file: Data, filename: String)? = nil,
        accessToken: String?
    ) async throws -> T {
        let pathComponents = path.split(separator: "/").map(String.init)
        var url = baseURL
        for comp in pathComponents { url = url.appendingPathComponent(comp) }

        var request = URLRequest(url: url)
        request.httpMethod = method

        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let (key, fileData, filename) = formData {
            let boundary = UUID().uuidString
            request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
            var data = Data()
            data.append("--\(boundary)\r\n".data(using: .utf8)!)
            data.append("Content-Disposition: form-data; name=\"\(key)\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
            data.append("Content-Type: text/csv\r\n\r\n".data(using: .utf8)!)
            data.append(fileData)
            data.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
            request.httpBody = data
        } else if let body = body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = body
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw URLError(.badServerResponse) }
        guard (200...299).contains(http.statusCode) else {
            if let err = try? JSONDecoder().decode(APIError.self, from: data) {
                throw BackendError.server(err.error)
            }
            throw BackendError.status(http.statusCode)
        }
        let decoder = JSONDecoder()
        return try decoder.decode(T.self, from: data)
    }

    func uploadCSV(fileData: Data, filename: String, accountId: String?, accessToken: String?) async throws -> UploadResponse {
        var url = baseURL
        for comp in ["api", "upload"] { url = url.appendingPathComponent(comp) }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        let boundary = UUID().uuidString
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        var data = Data()
        data.append("--\(boundary)\r\n".data(using: .utf8)!)
        data.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        data.append("Content-Type: text/csv\r\n\r\n".data(using: .utf8)!)
        data.append(fileData)
        if let aid = accountId, !aid.isEmpty {
            data.append("\r\n--\(boundary)\r\n".data(using: .utf8)!)
            data.append("Content-Disposition: form-data; name=\"account_id\"\r\n\r\n".data(using: .utf8)!)
            data.append(aid.data(using: .utf8)!)
        }
        data.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = data

        let (respData, resp) = try await URLSession.shared.data(for: request)
        guard let http = resp as? HTTPURLResponse else { throw URLError(.badServerResponse) }
        let decoder = JSONDecoder()
        let result = try decoder.decode(UploadResponse.self, from: respData)
        if http.statusCode >= 400 {
            throw BackendError.status(http.statusCode)
        }
        return result
    }

    func getHousehold(accessToken: String?) async throws -> [HouseholdMembership] {
        let response: HouseholdResponse = try await request(path: "api/household", method: "GET", accessToken: accessToken)
        return response.memberships ?? []
    }

    func createHousehold(name: String, accessToken: String?) async throws -> HouseholdResponse {
        struct Body: Encodable { let action = "create"; let name: String }
        let body = try JSONEncoder().encode(Body(name: name))
        return try await request(path: "api/household", method: "POST", body: body, accessToken: accessToken)
    }

    func inviteHousehold(householdId: String, email: String, accessToken: String?) async throws {
        struct Body: Encodable { let action = "invite"; let household_id: String; let email: String }
        let body = try JSONEncoder().encode(Body(household_id: householdId, email: email))
        let _: HouseholdResponse = try await request(path: "api/household", method: "POST", body: body, accessToken: accessToken)
    }

    func acceptInvite(membershipId: String, accessToken: String?) async throws {
        struct Body: Encodable { let action = "accept"; let membership_id: String }
        let body = try JSONEncoder().encode(Body(membership_id: membershipId))
        let _: HouseholdResponse = try await request(path: "api/household", method: "POST", body: body, accessToken: accessToken)
    }

    func getChatHistory(accessToken: String?) async throws -> [ChatMessage] {
        struct Wrapper: Decodable { let messages: [ChatMessage]? }
        let w: Wrapper = try await request(path: "api/chat", method: "GET", accessToken: accessToken)
        return w.messages ?? []
    }

    func chat(question: String, accessToken: String?) async throws -> String {
        let body = try JSONEncoder().encode(ChatRequest(question: question))
        let response: ChatPostResponse = try await request(path: "api/chat", method: "POST", body: body, accessToken: accessToken)
        return response.response?.explanation ?? ""
    }
}

private struct APIError: Decodable {
    let error: String
}

enum BackendError: Error {
    case status(Int)
    case server(String)
}
