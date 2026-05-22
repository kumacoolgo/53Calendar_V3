# 53 Calendar V3

日本向けのごみ収集カレンダーです。V3 は V2 の Web 版をベースに整理し、文字化けしていた表示を修正したうえで、ホーム画面ウィジェット用の今月データ出力を追加しています。

## 機能

- 今月、前月、次月の収集予定を表示
- ごみ分類、毎週ルール、第何週ルールを自由に設定
- 明日の収集予定を通知風に表示
- 今月または年間 12か月の PDF 出力
- PWA のオフラインキャッシュ
- `widget.html` によるウィジェット表示プレビュー
- iOS WidgetKit と Android AppWidget のネイティブ実装テンプレート

## ローカル実行

```bash
npm install
npm run serve
```

その後、`http://127.0.0.1:4173/index.html` を開きます。

`index.html` を直接開いても動作しますが、PWA のオフラインキャッシュや一部のモバイルインストール機能には HTTP/HTTPS 環境が必要です。

## ウィジェット用データ

メインアプリは今月のデータを以下に出力します。

- `localStorage["calendar53-widget-data"]`
- `window.Calendar53WidgetData`
- iOS WebView bridge：`window.webkit.messageHandlers.calendar53Widget.postMessage(data)`
- Android WebView bridge：`window.Calendar53Android.updateWidgetData(JSON.stringify(data))`

ネイティブアプリ側では、この JSON をシステムウィジェットから読める共有ストレージへ同期します。

- iOS：`UserDefaults(suiteName: "group.com.kumacoolgo.calendar53")`
- Android：`SharedPreferences("calendar53_widget")`

テンプレートコードは `native-widgets/` にあります。

## iOS ホーム画面ウィジェットの組み込み

1. Xcode で App に Widget Extension を追加します。
2. `native-widgets/ios/Calendar53Widget/Calendar53Widget.swift` を Widget Extension にコピーします。
3. App target と Widget target の両方で App Groups を有効にします。既定の group id は `group.com.kumacoolgo.calendar53` です。
4. Web ページを表示している App で `calendar53Widget` message handler を受け取り、同じ App Group の `calendar53-widget-data` に JSON 文字列を保存します。
5. `WidgetCenter.shared.reloadAllTimelines()` を呼び出してホーム画面ウィジェットを更新します。

## Android ホーム画面ウィジェットの組み込み

1. `native-widgets/android/app/src/main/...` を Android App に取り込みます。
2. `native-widgets/android/AndroidManifest-snippet.xml` の receiver を正式な `AndroidManifest.xml` に追加します。
3. Web ページを表示している App で `Calendar53Android.updateWidgetData(json)` を実装し、`SharedPreferences("calendar53_widget")` の `calendar53-widget-data` に保存します。
4. `com.kumacoolgo.calendar53.widget.REFRESH` を送信するか、`AppWidgetManager.updateAppWidget` を呼び出してホーム画面ウィジェットを更新します。

## 注意

純粋な PWA だけでは、iOS の本物のホーム画面ウィジェットを直接作成できません。V3 では Web/PWA ページ、ウィジェット表示プレビュー、ネイティブウィジェットのテンプレートを用意しています。iOS/Android のホーム画面で「アプリを開かずに今月の予定を見る」には、Web ページをネイティブアプリまたは既存アプリに組み込んで、このテンプレートを接続してください。
