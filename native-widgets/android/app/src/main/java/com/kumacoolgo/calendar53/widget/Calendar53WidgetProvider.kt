package com.kumacoolgo.calendar53.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.widget.RemoteViews
import org.json.JSONObject

class Calendar53WidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { updateWidget(context, manager, it) }
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == ACTION_REFRESH) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(android.content.ComponentName(context, Calendar53WidgetProvider::class.java))
            ids.forEach { updateWidget(context, manager, it) }
        }
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, widgetId: Int) {
        val data = context
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(WIDGET_DATA_KEY, null)

        val bitmap = CalendarBitmapRenderer.render(data)
        val views = RemoteViews(context.packageName, R.layout.calendar53_widget)
        views.setImageViewBitmap(R.id.calendar53_widget_image, bitmap)
        manager.updateAppWidget(widgetId, views)
    }

    companion object {
        const val ACTION_REFRESH = "com.kumacoolgo.calendar53.widget.REFRESH"
        const val PREFS_NAME = "calendar53_widget"
        const val WIDGET_DATA_KEY = "calendar53-widget-data"
    }
}

private object CalendarBitmapRenderer {
    private val weekdays = listOf("日", "一", "二", "三", "四", "五", "六")

    fun render(rawJson: String?): Bitmap {
        val width = 900
        val height = 540
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        canvas.drawColor(Color.WHITE)

        val json = rawJson?.let { runCatching { JSONObject(it) }.getOrNull() }
        val title = json?.optString("title")?.takeIf { it.isNotBlank() } ?: "53 Calendar"
        val days = json?.optJSONArray("days")

        paint.color = Color.rgb(23, 32, 51)
        paint.textSize = 42f
        paint.isFakeBoldText = true
        canvas.drawText(title, 30f, 58f, paint)

        paint.textSize = 24f
        weekdays.forEachIndexed { index, day ->
            paint.color = when (index) {
                0 -> Color.rgb(220, 38, 38)
                6 -> Color.rgb(37, 99, 235)
                else -> Color.rgb(102, 112, 133)
            }
            paint.textAlign = Paint.Align.CENTER
            canvas.drawText(day, 64f + index * 123f, 102f, paint)
        }

        val cellW = 116f
        val cellH = 66f
        val startX = 8f
        val startY = 120f

        for (index in 0 until 42) {
            val row = index / 7
            val col = index % 7
            val left = startX + col * 126f
            val top = startY + row * 68f
            val day = days?.optJSONObject(index)
            if (day == null || day.optBoolean("empty")) continue

            val isToday = day.optBoolean("isToday")
            val rect = RectF(left, top, left + cellW, top + cellH)
            paint.style = Paint.Style.FILL
            paint.color = if (isToday) Color.rgb(255, 251, 235) else Color.WHITE
            canvas.drawRoundRect(rect, 10f, 10f, paint)
            paint.style = Paint.Style.STROKE
            paint.strokeWidth = if (isToday) 4f else 1.5f
            paint.color = if (isToday) Color.rgb(245, 158, 11) else Color.rgb(221, 227, 238)
            canvas.drawRoundRect(rect, 10f, 10f, paint)

            paint.style = Paint.Style.FILL
            paint.textAlign = Paint.Align.CENTER
            paint.isFakeBoldText = true
            paint.textSize = 24f
            paint.color = when {
                day.optString("holiday").isNotBlank() || day.optInt("weekday") == 0 -> Color.rgb(220, 38, 38)
                day.optInt("weekday") == 6 -> Color.rgb(37, 99, 235)
                else -> Color.rgb(23, 32, 51)
            }
            canvas.drawText(day.optInt("day").toString(), left + cellW / 2, top + 25f, paint)

            val item = day.optJSONArray("items")?.optJSONObject(0)
            if (item != null) {
                val chip = RectF(left + 7f, top + 35f, left + cellW - 7f, top + 58f)
                paint.color = parseColor(item.optString("bgColor"), Color.rgb(219, 234, 254))
                canvas.drawRoundRect(chip, 6f, 6f, paint)
                paint.color = parseColor(item.optString("textColor"), Color.rgb(29, 78, 216))
                paint.textSize = 16f
                val label = item.optString("label").take(6)
                canvas.drawText(label, left + cellW / 2, top + 52f, paint)
            }
        }

        return bitmap
    }

    private fun parseColor(value: String, fallback: Int): Int {
        return runCatching { Color.parseColor(value) }.getOrDefault(fallback)
    }
}
