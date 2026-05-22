# 53 Calendar V3

一个可自定义垃圾收集规则的日历工具。V3 基于 V2 的纯 Web 版本整理而来，修复了乱码文案，并新增桌面小组件需要的当前月数据输出。

## 功能

- 查看当前月、上个月、下个月的收集安排
- 自定义垃圾分类、每周规则、指定第几周规则
- 明日收集提醒
- 导出当前月或全年 PDF
- PWA 离线缓存
- `widget.html` 小组件预览页
- iOS WidgetKit 与 Android AppWidget 原生源码模板

## 本地运行

```bash
npm install
npm run serve
```

然后打开 `http://127.0.0.1:4173/index.html`。

也可以直接打开 `index.html`，但 PWA 离线缓存和部分移动端安装能力需要 HTTP/HTTPS 环境。

## 小组件数据

主应用会把当前月数据写入：

- `localStorage["calendar53-widget-data"]`
- `window.Calendar53WidgetData`
- iOS WebView bridge：`window.webkit.messageHandlers.calendar53Widget.postMessage(data)`
- Android WebView bridge：`window.Calendar53Android.updateWidgetData(JSON.stringify(data))`

原生 App 需要把这份 JSON 同步到系统小组件可读取的共享存储：

- iOS：`UserDefaults(suiteName: "group.com.kumacoolgo.calendar53")`
- Android：`SharedPreferences("calendar53_widget")`

模板代码在 `native-widgets/` 下。

## iOS 桌面小组件接入

1. 用 Xcode 给 App 添加 Widget Extension。
2. 复制 `native-widgets/ios/Calendar53Widget/Calendar53Widget.swift` 到 Widget Extension。
3. 给 App target 和 Widget target 同时开启 App Groups，默认 group id 是 `group.com.kumacoolgo.calendar53`。
4. 在承载 Web 页面的 App 中接收 `calendar53Widget` message handler，并把 JSON 字符串保存到同一个 App Group 的 `calendar53-widget-data`。
5. 调用 `WidgetCenter.shared.reloadAllTimelines()` 刷新桌面小组件。

## Android 桌面小组件接入

1. 把 `native-widgets/android/app/src/main/...` 合并进 Android App。
2. 把 `native-widgets/android/AndroidManifest-snippet.xml` 中的 receiver 加进正式 `AndroidManifest.xml`。
3. 在承载 Web 页面的 App 中实现 `Calendar53Android.updateWidgetData(json)`，保存到 `SharedPreferences("calendar53_widget")` 的 `calendar53-widget-data`。
4. 发送 `com.kumacoolgo.calendar53.widget.REFRESH` 或调用 `AppWidgetManager.updateAppWidget` 刷新桌面小组件。

## 注意

纯 PWA 不能在 iOS 上直接创建真正的系统桌面小组件。V3 已提供 Web/PWA 页面、widget 预览页和原生小组件源码；要上架或安装成 iOS/Android 桌面小组件，需要把 Web 页面放进原生壳或现有原生 App 中接入这些模板。
