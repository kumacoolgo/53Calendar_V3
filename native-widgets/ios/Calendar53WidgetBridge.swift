import WebKit
import WidgetKit

final class Calendar53WidgetBridge: NSObject, WKScriptMessageHandler {
    private let appGroupId = "group.com.kumacoolgo.calendar53"
    private let widgetDataKey = "calendar53-widget-data"

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "calendar53Widget" else { return }

        let json: String?
        if let value = message.body as? String {
            json = value
        } else if JSONSerialization.isValidJSONObject(message.body),
                  let data = try? JSONSerialization.data(withJSONObject: message.body),
                  let value = String(data: data, encoding: .utf8) {
            json = value
        } else {
            json = nil
        }

        guard let json else { return }
        UserDefaults(suiteName: appGroupId)?.set(json, forKey: widgetDataKey)
        WidgetCenter.shared.reloadAllTimelines()
    }
}
