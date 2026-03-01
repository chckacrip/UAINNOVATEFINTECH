import SwiftUI

struct ChatView: View {
    @EnvironmentObject var supabase: SupabaseService
    @State private var messages: [ChatMessage] = []
    @State private var input = ""
    @State private var loading = false
    @State private var historyLoading = true
    @State private var errorMessage: String?

    private let suggested = [
        "Where am I spending the most money?",
        "What subscriptions can I cancel to save money?",
        "How healthy is my budget this month?",
        "What are my biggest financial risks right now?",
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 16) {
                            // Header matching web
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Financial Analyst")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                Text("Ask questions about your spending, savings, and financial health.")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal)

                            ForEach(messages) { msg in
                                Group {
                                    if msg.role == "user" {
                                        HStack(alignment: .top) {
                                            Spacer(minLength: 24)
                                            Text(msg.content)
                                                .font(.subheadline)
                                                .foregroundStyle(.white)
                                                .padding(.horizontal, 14)
                                                .padding(.vertical, 10)
                                                .background(Color.blue)
                                                .clipShape(RoundedRectangle(cornerRadius: 16))
                                        }
                                        .padding(.horizontal)
                                    } else {
                                        AssistantBubble(message: msg)
                                            .padding(.horizontal)
                                    }
                                }
                                .id(msg.id)
                            }

                            if loading {
                                HStack(alignment: .top) {
                                    ProgressView()
                                    Text("Analyzing your data...")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                    Spacer()
                                }
                                .padding()
                            }
                        }
                        .padding(.vertical, 12)
                    }
                    .dismissKeyboardOnTap()
                    .onChange(of: messages.count) { _ in
                        if let last = messages.last {
                            withAnimation(.easeOut(duration: 0.2)) {
                                proxy.scrollTo(last.id, anchor: .bottom)
                            }
                        }
                    }
                }

                if let err = errorMessage {
                    Text(err)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 8)
                }

                if messages.isEmpty && !historyLoading {
                    VStack(spacing: 12) {
                        Text("Ask me anything about your finances")
                            .font(.headline)
                        Text("I have access to your transaction history and can provide personalized insights.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                            ForEach(suggested, id: \.self) { q in
                                Button {
                                    errorMessage = nil
                                    Task { await send(question: q) }
                                } label: {
                                    Text(q)
                                        .font(.subheadline)
                                        .multilineTextAlignment(.leading)
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 10)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .background(Color(.secondarySystemBackground))
                                        .clipShape(RoundedRectangle(cornerRadius: 12))
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 24)
                    }
                    .padding(.vertical, 20)
                }

                HStack(alignment: .bottom, spacing: 10) {
                    TextField("Ask about your finances...", text: $input, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(1...4)
                        .submitLabel(.send)
                        .onSubmit { Task { await send() } }
                    Button {
                        errorMessage = nil
                        Task { await send() }
                    } label: {
                        if loading {
                            ProgressView()
                                .scaleEffect(0.8)
                                .tint(.white)
                        } else {
                            Image(systemName: "paperplane.fill")
                                .font(.system(size: 18))
                                .foregroundStyle(.white)
                        }
                    }
                    .frame(width: 44, height: 44)
                    .background(Color.blue)
                    .clipShape(Circle())
                    .disabled(input.trimmingCharacters(in: .whitespaces).isEmpty || loading)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
            .navigationTitle("Chat")
            .navigationBarTitleDisplayMode(.inline)
            .task { await loadHistory() }
        }
    }

    private func loadHistory() async {
        await MainActor.run { historyLoading = true; errorMessage = nil }
        do {
            let list = try await BackendAPIClient.shared.getChatHistory(accessToken: supabase.accessToken)
            await MainActor.run {
                messages = list
                historyLoading = false
                errorMessage = nil
            }
        } catch {
            await MainActor.run {
                historyLoading = false
                errorMessage = connectionHint(for: error)
            }
        }
    }

    private func send(question: String? = nil) async {
        let question = question ?? input.trimmingCharacters(in: .whitespaces)
        guard !question.isEmpty else { return }
        guard let token = supabase.accessToken else {
            await MainActor.run { errorMessage = "Please sign in again." }
            return
        }
        let userMsg = ChatMessage(id: UUID().uuidString, user_id: nil, role: "user", content: question, metadata: nil, created_at: nil)
        await MainActor.run {
            messages.append(userMsg)
            if question == input.trimmingCharacters(in: .whitespaces) { input = "" }
            loading = true
            errorMessage = nil
        }
        do {
            let response = try await BackendAPIClient.shared.chat(question: question, accessToken: token)
            let content = response?.explanation ?? ""
            await MainActor.run {
                messages.append(ChatMessage(id: UUID().uuidString, user_id: nil, role: "assistant", content: content.isEmpty ? "No response." : content, metadata: response, created_at: nil))
                loading = false
            }
        } catch {
            await MainActor.run {
                messages.append(ChatMessage(id: UUID().uuidString, user_id: nil, role: "assistant", content: "Sorry, I could not reach the server. Check your connection and try again.", metadata: nil, created_at: nil))
                loading = false
                errorMessage = connectionHint(for: error)
            }
        }
    }

    private func connectionHint(for error: Error) -> String {
        let ns = error as NSError
        if ns.domain == NSURLErrorDomain {
            switch ns.code {
            case NSURLErrorCannotConnectToHost, NSURLErrorNetworkConnectionLost, NSURLErrorNotConnectedToInternet:
                return "Check your internet connection. If using a cloud backend, ensure BACKEND_BASE_URL in Config.plist is correct (e.g. your Amplify URL)."
            case NSURLErrorTimedOut:
                return "Request timed out. Check your connection and that the backend is reachable."
            default:
                break
            }
        }
        if (error as? BackendError) != nil {
            return "Server returned an error. Check that the backend is deployed and that BACKEND_BASE_URL in Config.plist points to it."
        }
        return ""
    }
}

// MARK: - Assistant message bubble (matches web: explanation + Insights / Risks / Recommended Actions)
private struct AssistantBubble: View {
    let message: ChatMessage

    private var explanation: String {
        if let meta = message.metadata, let exp = meta.explanation, !exp.isEmpty {
            return exp
        }
        return message.content
    }

    private var insights: [String] { message.metadata?.insights ?? [] }
    private var risks: [String] { message.metadata?.risks ?? [] }
    private var actions: [RecommendedAction] { message.metadata?.recommended_actions ?? [] }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(explanation)
                .font(.subheadline)
                .textSelection(.enabled)

            if !insights.isEmpty {
                SectionLabel(icon: "lightbulb.fill", color: .orange, title: "INSIGHTS")
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(Array(insights.enumerated()), id: \.offset) { _, item in
                        BulletRow(text: item, bulletColor: .blue)
                    }
                }
            }

            if !risks.isEmpty {
                SectionLabel(icon: "exclamationmark.triangle.fill", color: .red, title: "RISKS")
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(Array(risks.enumerated()), id: \.offset) { _, item in
                        BulletRow(text: item, bulletColor: .red)
                    }
                }
            }

            if !actions.isEmpty {
                SectionLabel(icon: "list.bullet.clipboard.fill", color: .green, title: "RECOMMENDED ACTIONS")
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(Array(actions.enumerated()), id: \.offset) { _, item in
                        HStack(alignment: .top, spacing: 6) {
                            Text("→")
                                .font(.subheadline)
                                .foregroundStyle(.green)
                            Text(item.action)
                                .font(.subheadline)
                            if let impact = item.estimated_monthly_impact, impact > 0 {
                                Text("Save ~$\(Int(impact))/mo")
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.green)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.green.opacity(0.2))
                                    .clipShape(Capsule())
                            }
                        }
                    }
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

private struct SectionLabel: View {
    let icon: String
    let color: Color
    let title: String

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundStyle(color)
            Text(title)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)
        }
    }
}

private struct BulletRow: View {
    let text: String
    let bulletColor: Color

    var body: some View {
        HStack(alignment: .top, spacing: 6) {
            Text("•")
                .foregroundStyle(bulletColor)
            Text(text)
                .font(.subheadline)
        }
    }
}
