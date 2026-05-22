const COLOR_PALETTE = [
  { bgColor: "#fee2e2", textColor: "#991b1b", color: "#ef4444" },
  { bgColor: "#fef3c7", textColor: "#92400e", color: "#f59e0b" },
  { bgColor: "#dbeafe", textColor: "#1d4ed8", color: "#3b82f6" },
  { bgColor: "#dcfce7", textColor: "#166534", color: "#22c55e" },
  { bgColor: "#e0e7ff", textColor: "#3730a3", color: "#6366f1" },
  { bgColor: "#fae8ff", textColor: "#86198f", color: "#e879f9" },
  { bgColor: "#f3e8ff", textColor: "#6b21a8", color: "#a855f7" },
  { bgColor: "#e0f2fe", textColor: "#075985", color: "#0ea5e9" }
];

const DEFAULT_TYPES = [
  { id: "burnable", label: "可燃垃圾", color: "#ef4444", bgColor: "#fee2e2", textColor: "#991b1b", icon: "fa-fire" },
  { id: "nonburnable", label: "不可燃垃圾", color: "#374151", bgColor: "#f3f4f6", textColor: "#374151", icon: "fa-battery-full" },
  { id: "plastic", label: "塑料包装", color: "#1d4ed8", bgColor: "#dbeafe", textColor: "#1e40af", icon: "fa-bottle-water" },
  { id: "paper", label: "纸类/纸箱", color: "#a16207", bgColor: "#fef9c3", textColor: "#854d0e", icon: "fa-newspaper" },
  { id: "pet", label: "PET 瓶", color: "#15803d", bgColor: "#dcfce7", textColor: "#166534", icon: "fa-recycle" },
  { id: "tray", label: "食品托盘", color: "#4338ca", bgColor: "#e0e7ff", textColor: "#3730a3", icon: "fa-utensils" },
  { id: "cloth", label: "旧衣物", color: "#a21caf", bgColor: "#fae8ff", textColor: "#86198f", icon: "fa-shirt" }
];

const DEFAULT_RULES = {
  burnable: { mode: "weekly", weekdays: [3, 6], nth: [] },
  nonburnable: { mode: "nth", weekdays: [1], nth: [1, 3] },
  plastic: { mode: "weekly", weekdays: [2], nth: [] },
  paper: { mode: "nth", weekdays: [2], nth: [2, 4] },
  pet: { mode: "weekly", weekdays: [5], nth: [] },
  tray: { mode: "weekly", weekdays: [5], nth: [] },
  cloth: { mode: "weekly", weekdays: [5], nth: [] }
};

const STORAGE_KEY = "calendar53-state-v3";
const WIDGET_KEY = "calendar53-widget-data";
const HOLIDAY_API_URL = "https://holidays-jp.github.io/api/v1/date.json";
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

let types = [];
let rules = {};
let currentDate = startOfDay(new Date());
let holidaysMap = null;
let holidaysLoaded = false;
let renderTimer = null;
let isExporting = false;

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function getToday() {
  return startOfDay(new Date());
}

function getTomorrow() {
  const tomorrow = getToday();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDefaultState() {
  return { types: clone(DEFAULT_TYPES), rules: clone(DEFAULT_RULES) };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    const loadedTypes = Array.isArray(parsed.types) && parsed.types.length ? parsed.types : DEFAULT_TYPES;
    const loadedRules = parsed.rules && typeof parsed.rules === "object" ? parsed.rules : DEFAULT_RULES;
    const state = { types: clone(loadedTypes), rules: clone(loadedRules) };

    state.types.forEach(type => {
      if (!state.rules[type.id]) {
        state.rules[type.id] = { mode: "off", weekdays: [], nth: [] };
      }
    });
    return state;
  } catch {
    return createDefaultState();
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ types, rules }));
  publishWidgetData();
}

function checkRule(date, rule) {
  if (!rule || rule.mode === "off") return false;
  const weekday = date.getDay();
  if (!rule.weekdays.includes(weekday)) return false;
  if (rule.mode === "weekly") return true;
  if (rule.mode === "nth") {
    const nth = Math.floor((date.getDate() - 1) / 7) + 1;
    return rule.nth.includes(nth);
  }
  return false;
}

function getGarbageList(date) {
  return types.filter(type => checkRule(date, rules[type.id]));
}

function getHolidayName(date) {
  if (!holidaysMap) return null;
  return holidaysMap[dateKey(date)] || null;
}

function buildMonthData(date = currentDate) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const todayKey = dateKey(getToday());
  const days = [];

  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push({ empty: true });
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const itemDate = startOfDay(new Date(year, month, day));
    const holiday = getHolidayName(itemDate);
    days.push({
      date: dateKey(itemDate),
      day,
      weekday: itemDate.getDay(),
      isToday: dateKey(itemDate) === todayKey,
      holiday,
      items: getGarbageList(itemDate).map(item => ({
        id: item.id,
        label: item.label,
        color: item.color,
        bgColor: item.bgColor,
        textColor: item.textColor
      }))
    });
  }

  while (days.length % 7 !== 0) {
    days.push({ empty: true });
  }

  return {
    version: 3,
    generatedAt: new Date().toISOString(),
    year,
    month: month + 1,
    title: `${year}年 ${month + 1}月`,
    weekdays: WEEKDAYS,
    days,
    types: types.map(({ id, label, color, bgColor, textColor }) => ({ id, label, color, bgColor, textColor }))
  };
}

function publishWidgetData() {
  const data = buildMonthData(getToday());
  localStorage.setItem(WIDGET_KEY, JSON.stringify(data));
  window.Calendar53WidgetData = data;

  if (window.webkit?.messageHandlers?.calendar53Widget) {
    window.webkit.messageHandlers.calendar53Widget.postMessage(data);
  }
  if (window.Calendar53Android?.updateWidgetData) {
    window.Calendar53Android.updateWidgetData(JSON.stringify(data));
  }
}

function fetchHolidays() {
  fetch(HOLIDAY_API_URL)
    .then(res => res.json())
    .then(data => {
      holidaysMap = data;
      holidaysLoaded = true;
      renderCalendar();
      publishWidgetData();
    })
    .catch(err => {
      console.warn("节假日数据获取失败，将使用本地规则继续显示。", err);
      holidaysLoaded = false;
      publishWidgetData();
    });
}

function changeMonth(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  currentDate = startOfDay(currentDate);
  if (renderTimer) cancelAnimationFrame(renderTimer);
  renderTimer = requestAnimationFrame(renderCalendar);
}

function renderCalendar() {
  const monthData = buildMonthData(currentDate);
  document.getElementById("monthLabel").textContent = monthData.title;

  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = "";

  monthData.days.forEach(item => {
    const cell = document.createElement("button");
    cell.className = "day-cell";
    cell.type = "button";

    if (item.empty) {
      cell.classList.add("other-month");
      cell.disabled = true;
      grid.appendChild(cell);
      return;
    }

    if (item.weekday === 0) cell.classList.add("sun");
    if (item.weekday === 6) cell.classList.add("sat");
    if (item.holiday) cell.classList.add("holiday");
    if (item.isToday) cell.classList.add("today");

    const num = document.createElement("div");
    num.className = "date-num";
    num.textContent = item.day;
    cell.appendChild(num);

    const labels = document.createElement("div");
    labels.className = "labels-container";
    item.items.forEach(garbage => {
      const label = document.createElement("div");
      label.className = "mini-label";
      label.textContent = garbage.label;
      label.style.background = garbage.bgColor;
      label.style.color = garbage.textColor;
      labels.appendChild(label);
    });
    cell.appendChild(labels);

    cell.addEventListener("click", () => openDetail(new Date(item.date), item.items, item.holiday));
    grid.appendChild(cell);
  });

  renderTomorrowBanner();
  publishWidgetData();
}

function renderTomorrowBanner() {
  const container = document.getElementById("bannerContainer");
  container.innerHTML = "";

  const tomorrow = getTomorrow();
  const list = getGarbageList(tomorrow);
  if (!list.length) return;

  const banner = document.createElement("div");
  banner.className = "tomorrow-banner";
  banner.innerHTML = `
    <i class="fa-solid fa-bell"></i>
    <div class="banner-content">
      <div>明天（${tomorrow.getMonth() + 1}月${tomorrow.getDate()}日）是 <strong>${list.map(t => t.label).join("、")}</strong> 的收集日</div>
      <small>把要丢的物品提前准备好</small>
    </div>
  `;
  container.appendChild(banner);
}

function renderLegend() {
  const el = document.getElementById("legendContainer");
  el.innerHTML = types.map(type => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${type.bgColor}; border:1px solid ${type.color};"></span>
      ${type.label}
    </div>
  `).join("");
}

function openDetail(date, list, holidayNameFromCell) {
  const nth = Math.floor((date.getDate() - 1) / 7) + 1;
  const holidayName = holidayNameFromCell || getHolidayName(date);
  document.getElementById("detailDateStr").textContent =
    `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（周${WEEKDAYS[date.getDay()]}）`;
  document.getElementById("detailMetaStr").textContent =
    `第 ${nth} 周${holidayName ? ` · ${holidayName}` : ""}`;

  const container = document.getElementById("detailList");
  if (!list.length) {
    container.innerHTML = `<div class="detail-empty"><i class="fa-regular fa-face-smile"></i><br>今天没有收集安排</div>`;
  } else {
    container.innerHTML = list.map(item => `
      <div class="detail-item" style="border-left-color:${item.color}; border-left-width:4px;">
        <div class="detail-icon" style="background:${item.bgColor}; color:${item.textColor};">
          <i class="fa-solid ${types.find(t => t.id === item.id)?.icon || "fa-trash-can"}"></i>
        </div>
        <div class="detail-name">${item.label}</div>
      </div>
    `).join("");
  }
  toggleModal("detailModal", true);
}

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "cat";
}

function addCategory() {
  const name = prompt("请输入新的垃圾分类名称");
  if (!name || !name.trim()) return;
  const trimmed = name.trim();
  const baseId = slugify(trimmed);
  let id = baseId;
  let index = 1;
  while (types.some(type => type.id === id)) id = `${baseId}-${index++}`;

  const palette = COLOR_PALETTE[types.length % COLOR_PALETTE.length];
  types.push({ id, label: trimmed, ...palette, icon: "fa-trash-can" });
  rules[id] = { mode: "off", weekdays: [], nth: [] };
  persistState();
  renderSettingsUI();
  renderCalendar();
  renderLegend();
}

function deleteCategory(id) {
  if (types.length <= 1) {
    alert("至少需要保留一个分类。");
    return;
  }
  const type = types.find(item => item.id === id);
  if (!confirm(`删除「${type ? type.label : id}」吗？`)) return;
  types = types.filter(item => item.id !== id);
  delete rules[id];
  persistState();
  renderSettingsUI();
  renderCalendar();
  renderLegend();
}

function resetAll() {
  if (!confirm("恢复默认分类和收集规则吗？")) return;
  const state = createDefaultState();
  types = state.types;
  rules = state.rules;
  localStorage.removeItem(STORAGE_KEY);
  persistState();
  renderSettingsUI();
  renderCalendar();
  renderLegend();
}

function renderSettingsUI() {
  const container = document.getElementById("settingsList");
  container.innerHTML = "";

  types.forEach(type => {
    const rule = rules[type.id];
    const disabled = rule.mode === "off" || rule.weekdays.length === 0 || (rule.mode === "nth" && rule.nth.length === 0);
    const wrapper = document.createElement("div");
    wrapper.className = "setting-group";
    wrapper.dataset.id = type.id;
    wrapper.innerHTML = `
      <div class="setting-header">
        <div class="setting-title">
          <div class="setting-indicator" style="background:${type.color}"></div>
          ${type.label}
        </div>
        <div class="setting-actions">
          ${disabled ? '<span class="badge-muted">停用</span>' : ""}
          <button class="delete-type-btn" type="button" title="删除" data-delete="${type.id}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
      <div class="mode-selector">
        <button class="mode-option ${rule.mode === "weekly" ? "active" : ""}" type="button" data-mode="weekly">每周</button>
        <button class="mode-option ${rule.mode === "nth" ? "active" : ""}" type="button" data-mode="nth">指定周</button>
        <button class="mode-option ${rule.mode === "off" ? "active" : ""}" type="button" data-mode="off">不显示</button>
      </div>
      <div class="options-container ${rule.mode === "off" ? "hidden" : ""}">
        <div class="option-label">星期</div>
        <div class="week-selector">
          ${[0, 1, 2, 3, 4, 5, 6].map(day => `
            <button class="toggle-btn ${rule.weekdays.includes(day) ? "active" : ""}" type="button" data-day="${day}">
              ${WEEKDAYS[day]}
            </button>
          `).join("")}
        </div>
        <div class="nth-wrapper ${rule.mode !== "nth" ? "hidden" : ""}">
          <div class="option-label">第几周</div>
          <div class="nth-selector">
            ${[1, 2, 3, 4, 5].map(nth => `
              <button class="toggle-btn ${rule.nth.includes(nth) ? "active" : ""}" type="button" data-nth="${nth}">
                第${nth}
              </button>
            `).join("")}
          </div>
        </div>
      </div>
    `;

    wrapper.querySelector("[data-delete]").addEventListener("click", () => deleteCategory(type.id));
    wrapper.querySelectorAll("[data-mode]").forEach(btn => {
      btn.addEventListener("click", () => {
        rules[type.id].mode = btn.dataset.mode;
        persistState();
        renderSettingsUI();
        renderCalendar();
      });
    });
    wrapper.querySelectorAll("[data-day]").forEach(btn => {
      btn.addEventListener("click", () => {
        const day = Number(btn.dataset.day);
        const list = rules[type.id].weekdays;
        const index = list.indexOf(day);
        if (index >= 0) list.splice(index, 1);
        else list.push(day);
        persistState();
        renderSettingsUI();
        renderCalendar();
      });
    });
    wrapper.querySelectorAll("[data-nth]").forEach(btn => {
      btn.addEventListener("click", () => {
        const nth = Number(btn.dataset.nth);
        const list = rules[type.id].nth;
        const index = list.indexOf(nth);
        if (index >= 0) list.splice(index, 1);
        else list.push(nth);
        persistState();
        renderSettingsUI();
        renderCalendar();
      });
    });

    container.appendChild(wrapper);
  });
}

function toggleModal(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle("active", show);
}

function waitForNextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

async function exportCurrentMonthPdf() {
  if (isExporting || typeof html2pdf === "undefined") return;
  isExporting = true;
  const target = document.getElementById("pdfArea");
  const filename = `53-calendar-${currentDate.getFullYear()}-${pad2(currentDate.getMonth() + 1)}.pdf`;

  try {
    document.body.classList.add("exporting-pdf");
    await waitForNextFrame();
    await html2pdf().set({
      margin: 4,
      filename,
      image: { type: "png", quality: 1 },
      html2canvas: { scale: 3, useCORS: true, backgroundColor: "#ffffff", logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" }
    }).from(target).save();
  } catch (err) {
    console.error(err);
    alert("PDF 生成失败，请稍后再试。");
  } finally {
    document.body.classList.remove("exporting-pdf");
    isExporting = false;
  }
}

async function exportWholeYearPdf() {
  if (isExporting || typeof html2pdf === "undefined") return;
  isExporting = true;
  const backupDate = new Date(currentDate);
  const year = backupDate.getFullYear();
  const tempRoot = document.createElement("div");
  tempRoot.id = "yearlyPdfArea";

  try {
    document.body.classList.add("exporting-pdf", "exporting-yearly-pdf");
    document.body.appendChild(tempRoot);

    for (let month = 0; month < 12; month++) {
      currentDate = startOfDay(new Date(year, month, 1));
      renderCalendar();
      await waitForNextFrame();
      const page = document.createElement("div");
      page.className = "yearly-print-page";
      const cloneNode = document.getElementById("pdfArea").cloneNode(true);
      cloneNode.querySelectorAll(".btn-icon, .btn-settings, #bannerContainer").forEach(el => el.remove());
      page.appendChild(cloneNode);
      tempRoot.appendChild(page);
    }

    await html2pdf().set({
      margin: 4,
      filename: `53-calendar-${year}-12months.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
      jsPDF: { unit: "mm", format: "a4", orientation: "landscape" },
      pagebreak: { mode: ["css"], avoid: [".yearly-print-page"] }
    }).from(tempRoot).save();
  } catch (err) {
    console.error(err);
    alert("年度 PDF 生成失败，请稍后再试。");
  } finally {
    tempRoot.remove();
    currentDate = backupDate;
    renderCalendar();
    document.body.classList.remove("exporting-pdf", "exporting-yearly-pdf");
    isExporting = false;
  }
}

function init() {
  const state = loadState();
  types = state.types;
  rules = state.rules;

  renderCalendar();
  renderLegend();
  renderSettingsUI();
  fetchHolidays();

  document.getElementById("prevMonth").onclick = () => changeMonth(-1);
  document.getElementById("nextMonth").onclick = () => changeMonth(1);
  document.getElementById("todayBtn").onclick = () => {
    currentDate = getToday();
    renderCalendar();
  };
  document.getElementById("openSettings").onclick = () => {
    renderSettingsUI();
    toggleModal("settingsModal", true);
  };
  document.getElementById("closeSettings").onclick = () => toggleModal("settingsModal", false);
  document.getElementById("saveSettings").onclick = () => {
    persistState();
    renderCalendar();
    renderLegend();
    toggleModal("settingsModal", false);
  };
  document.getElementById("resetSettings").onclick = resetAll;
  document.getElementById("addCategory").onclick = addCategory;
  document.getElementById("closeDetail").onclick = () => toggleModal("detailModal", false);
  document.getElementById("okDetail").onclick = () => toggleModal("detailModal", false);
  document.getElementById("closePrintChoice").onclick = () => toggleModal("printChoiceModal", false);
  document.getElementById("printMonthBtn").onclick = () => {
    toggleModal("printChoiceModal", false);
    exportCurrentMonthPdf();
  };
  document.getElementById("printYearBtn").onclick = () => {
    toggleModal("printChoiceModal", false);
    exportWholeYearPdf();
  };
  document.getElementById("printBtn").onclick = () => toggleModal("printChoiceModal", true);

  document.querySelectorAll(".modal-overlay").forEach(el => {
    el.addEventListener("click", event => {
      if (event.target === el) toggleModal(el.id, false);
    });
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      toggleModal("detailModal", false);
      toggleModal("settingsModal", false);
      toggleModal("printChoiceModal", false);
    }
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", init);
