package com.kumacoolgo.calendar53.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.webkit.JavascriptInterface

class Calendar53WidgetBridge(private val context: Context) {
    @JavascriptInterface
    fun updateWidgetData(json: String) {
        context
            .getSharedPreferences(Calendar53WidgetProvider.PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(Calendar53WidgetProvider.WIDGET_DATA_KEY, json)
            .apply()

        val manager = AppWidgetManager.getInstance(context)
        val component = ComponentName(context, Calendar53WidgetProvider::class.java)
        val ids = manager.getAppWidgetIds(component)
        ids.forEach { id ->
            Calendar53WidgetProvider().onUpdate(context, manager, intArrayOf(id))
        }
    }
}
