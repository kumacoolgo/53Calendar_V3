import SwiftUI
import WidgetKit

private let appGroupId = "group.com.kumacoolgo.calendar53"
private let widgetDataKey = "calendar53-widget-data"

struct Calendar53Day: Codable, Identifiable {
    var id: String { date ?? UUID().uuidString }
    let empty: Bool?
    let date: String?
    let day: Int?
    let weekday: Int?
    let isToday: Bool?
    let holiday: String?
    let items: [Calendar53Item]?
}

struct Calendar53Item: Codable {
    let label: String
    let bgColor: String
    let textColor: String
}

struct Calendar53Month: Codable {
    let title: String
    let weekdays: [String]
    let days: [Calendar53Day]

    static let fallback = Calendar53Month(title: "53 Calendar", weekdays: ["日", "一", "二", "三", "四", "五", "六"], days: [])
}

struct Calendar53Entry: TimelineEntry {
    let date: Date
    let month: Calendar53Month
}

struct Calendar53Provider: TimelineProvider {
    func placeholder(in context: Context) -> Calendar53Entry {
        Calendar53Entry(date: Date(), month: .fallback)
    }

    func getSnapshot(in context: Context, completion: @escaping (Calendar53Entry) -> Void) {
        completion(Calendar53Entry(date: Date(), month: loadMonth()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Calendar53Entry>) -> Void) {
        let entry = Calendar53Entry(date: Date(), month: loadMonth())
        let nextRefresh = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date().addingTimeInterval(3600)
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }

    private func loadMonth() -> Calendar53Month {
        guard
            let raw = UserDefaults(suiteName: appGroupId)?.string(forKey: widgetDataKey),
            let data = raw.data(using: .utf8),
            let month = try? JSONDecoder().decode(Calendar53Month.self, from: data)
        else {
            return .fallback
        }
        return month
    }
}

struct Calendar53WidgetView: View {
    let entry: Calendar53Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(entry.month.title)
                    .font(.headline)
                    .fontWeight(.bold)
                Spacer()
                Text("53")
                    .font(.caption2)
                    .fontWeight(.black)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(Color.yellow.opacity(0.25))
                    .clipShape(Capsule())
            }

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 3), count: 7), spacing: 3) {
                ForEach(Array(entry.month.weekdays.enumerated()), id: \.offset) { index, day in
                    Text(day)
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundStyle(index == 0 ? .red : index == 6 ? .blue : .secondary)
                }

                ForEach(entry.month.days) { day in
                    DayCell(day: day)
                }
            }
        }
        .padding(10)
        .containerBackground(.background, for: .widget)
    }
}

private struct DayCell: View {
    let day: Calendar53Day

    var body: some View {
        VStack(spacing: 2) {
            if day.empty == true {
                Color.clear
            } else {
                Text(String(day.day ?? 0))
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundStyle(day.holiday != nil || day.weekday == 0 ? .red : day.weekday == 6 ? .blue : .primary)

                if let item = day.items?.first {
                    Text(item.label)
                        .font(.system(size: 7, weight: .bold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                        .padding(.horizontal, 2)
                        .frame(maxWidth: .infinity)
                        .background(Color(hex: item.bgColor))
                        .foregroundStyle(Color(hex: item.textColor))
                        .clipShape(RoundedRectangle(cornerRadius: 3))
                }
            }
        }
        .frame(minHeight: 24)
        .padding(2)
        .background(day.isToday == true ? Color.yellow.opacity(0.18) : Color.clear)
        .overlay(
            RoundedRectangle(cornerRadius: 5)
                .stroke(day.isToday == true ? Color.orange : Color.gray.opacity(0.18), lineWidth: day.isToday == true ? 1.2 : 0.5)
        )
    }
}

private extension Color {
    init(hex: String) {
        let cleaned = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var value: UInt64 = 0
        Scanner(string: cleaned).scanHexInt64(&value)
        let red = Double((value >> 16) & 0xff) / 255
        let green = Double((value >> 8) & 0xff) / 255
        let blue = Double(value & 0xff) / 255
        self.init(red: red, green: green, blue: blue)
    }
}

@main
struct Calendar53Widget: Widget {
    let kind = "Calendar53Widget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Calendar53Provider()) { entry in
            Calendar53WidgetView(entry: entry)
        }
        .configurationDisplayName("53 Calendar")
        .description("在桌面直接查看当前月垃圾收集安排。")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}
