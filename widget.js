const WIDGET_KEY = "calendar53-widget-data";
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function pad2(value) {
  return String(value).padStart(2, "0");
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function fallbackMonthData() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const today = dateKey(now);
  const days = [];

  for (let i = 0; i < first.getDay(); i++) days.push({ empty: true });
  for (let day = 1; day <= last.getDate(); day++) {
    const date = new Date(year, month, day);
    days.push({
      date: dateKey(date),
      day,
      weekday: date.getDay(),
      isToday: dateKey(date) === today,
      items: []
    });
  }
  while (days.length % 7 !== 0) days.push({ empty: true });
  return { title: `${year}年 ${month + 1}月`, weekdays: WEEKDAYS, days };
}

function loadWidgetData() {
  try {
    const raw = localStorage.getItem(WIDGET_KEY);
    return raw ? JSON.parse(raw) : fallbackMonthData();
  } catch {
    return fallbackMonthData();
  }
}

function render() {
  const data = loadWidgetData();
  document.getElementById("widgetTitle").textContent = data.title;
  document.getElementById("todayPill").textContent = `${new Date().getDate()}日`;
  document.getElementById("widgetWeekdays").innerHTML = (data.weekdays || WEEKDAYS)
    .map((day, index) => `<div class="${index === 0 ? "sun" : index === 6 ? "sat" : ""}">${day}</div>`)
    .join("");

  document.getElementById("widgetGrid").innerHTML = data.days.map(day => {
    if (day.empty) return `<div class="widget-day empty"></div>`;
    const firstItem = day.items?.[0];
    const extra = day.items && day.items.length > 1 ? `<span class="more">+${day.items.length - 1}</span>` : "";
    return `
      <div class="widget-day ${day.isToday ? "today" : ""} ${day.weekday === 0 || day.holiday ? "sun" : ""} ${day.weekday === 6 ? "sat" : ""}">
        <div class="date">${day.day}</div>
        ${firstItem ? `<div class="chip" style="background:${firstItem.bgColor};color:${firstItem.textColor};">${firstItem.label}${extra}</div>` : ""}
      </div>
    `;
  }).join("");
}

render();
setInterval(render, 15 * 60 * 1000);
