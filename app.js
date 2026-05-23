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
  { id: "burnable", label: "燃えるごみ", color: "#ef4444", bgColor: "#fee2e2", textColor: "#991b1b", icon: "fa-fire" },
  { id: "nonburnable", label: "燃えないごみ", color: "#374151", bgColor: "#f3f4f6", textColor: "#374151", icon: "fa-battery-full" },
  { id: "plastic", label: "プラスチック", color: "#1d4ed8", bgColor: "#dbeafe", textColor: "#1e40af", icon: "fa-bottle-water" },
  { id: "paper", label: "古紙・段ボール", color: "#a16207", bgColor: "#fef9c3", textColor: "#854d0e", icon: "fa-newspaper" },
  { id: "pet", label: "ペットボトル", color: "#15803d", bgColor: "#dcfce7", textColor: "#166534", icon: "fa-recycle" },
  { id: "tray", label: "食品トレー", color: "#4338ca", bgColor: "#e0e7ff", textColor: "#3730a3", icon: "fa-utensils" },
  { id: "cloth", label: "古着", color: "#a21caf", bgColor: "#fae8ff", textColor: "#86198f", icon: "fa-shirt" }
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

const DEFAULT_LABELS_BY_ID = Object.fromEntries(DEFAULT_TYPES.map(type => [type.id, type.label]));

const STORAGE_KEY = "calendar53-state-v3";
const WIDGET_KEY = "calendar53-widget-data";
const APP_BUILD = "direct-canvas-pdf-7";
const HOLIDAY_API_URL = "https://holidays-jp.github.io/api/v1/date.json";
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

let types = [];
let rules = {};
let currentDate = startOfDay(new Date());
let holidaysMap = null;
let holidaysLoaded = false;
let renderTimer = null;
let isExporting = false;

console.info(`53 Calendar build: ${APP_BUILD}`);

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
    state.types = state.types.map(type => ({
      ...type,
      label: DEFAULT_LABELS_BY_ID[type.id] || type.label
    }));

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
      console.warn("祝日データの取得に失敗しました。ローカルの収集ルールで表示を続けます。", err);
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
      <div>明日（${tomorrow.getMonth() + 1}月${tomorrow.getDate()}日）は <strong>${list.map(t => t.label).join("、")}</strong> の収集日です</div>
      <small>出し忘れないように準備しておきましょう</small>
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
    `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日（${WEEKDAYS[date.getDay()]}）`;
  document.getElementById("detailMetaStr").textContent =
    `第${nth}週${holidayName ? ` · ${holidayName}` : ""}`;

  const container = document.getElementById("detailList");
  if (!list.length) {
    container.innerHTML = `<div class="detail-empty"><i class="fa-regular fa-face-smile"></i><br>今日の収集予定はありません</div>`;
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
  const name = prompt("新しいごみ分類名を入力してください");
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
    alert("分類は少なくとも1つ必要です。");
    return;
  }
  const type = types.find(item => item.id === id);
  if (!confirm(`「${type ? type.label : id}」を削除しますか？`)) return;
  types = types.filter(item => item.id !== id);
  delete rules[id];
  persistState();
  renderSettingsUI();
  renderCalendar();
  renderLegend();
}

function resetAll() {
  if (!confirm("分類と収集ルールを初期設定に戻しますか？")) return;
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
          ${disabled ? '<span class="badge-muted">無効</span>' : ""}
          <button class="delete-type-btn" type="button" title="削除" data-delete="${type.id}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
      <div class="mode-selector">
        <button class="mode-option ${rule.mode === "weekly" ? "active" : ""}" type="button" data-mode="weekly">毎週</button>
        <button class="mode-option ${rule.mode === "nth" ? "active" : ""}" type="button" data-mode="nth">第何週</button>
        <button class="mode-option ${rule.mode === "off" ? "active" : ""}" type="button" data-mode="off">表示しない</button>
      </div>
      <div class="options-container ${rule.mode === "off" ? "hidden" : ""}">
        <div class="option-label">曜日</div>
        <div class="week-selector">
          ${[0, 1, 2, 3, 4, 5, 6].map(day => `
            <button class="toggle-btn ${rule.weekdays.includes(day) ? "active" : ""}" type="button" data-day="${day}">
              ${WEEKDAYS[day]}
            </button>
          `).join("")}
        </div>
        <div class="nth-wrapper ${rule.mode !== "nth" ? "hidden" : ""}">
          <div class="option-label">対象週</div>
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

async function getJsPdfCtor() {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  if (window.jsPDF) return window.jsPDF;
  throw new Error("jsPDF is not available");
}

const PDF_CANVAS_WIDTH = 1600;
const PDF_CANVAS_HEIGHT = 1131;

function hexToRgb(hex, fallback = [255, 255, 255]) {
  if (!hex || typeof hex !== "string") return fallback;
  const cleaned = hex.replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(cleaned)) return fallback;
  return [
    parseInt(cleaned.slice(0, 2), 16),
    parseInt(cleaned.slice(2, 4), 16),
    parseInt(cleaned.slice(4, 6), 16)
  ];
}

function colorWithAlpha(hex, alpha = 1) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawRoundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, width, height, radius, fillStyle) {
  drawRoundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function strokeRoundRect(ctx, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
  drawRoundRect(ctx, x, y, width, height, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function fitText(ctx, text, maxWidth, baseSize, minSize = 13) {
  let size = baseSize;
  ctx.font = `700 ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif`;
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    ctx.font = `700 ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif`;
  }
}

function drawPdfLabel(ctx, text, x, y, width, bgColor, textColor) {
  const height = 24;
  fillRoundRect(ctx, x, y, width, height, 5, bgColor);
  ctx.fillStyle = textColor;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  fitText(ctx, text, width - 12, 15, 10);
  ctx.fillText(text, x + 7, y + height / 2 + 1, width - 12);
}

function createMonthPdfCanvas(date) {
  const data = buildMonthData(date);
  const canvas = document.createElement("canvas");
  canvas.width = PDF_CANVAS_WIDTH;
  canvas.height = PDF_CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const margin = 58;
  const titleY = 70;
  const gridX = margin;
  const gridY = 118;
  const gridWidth = canvas.width - margin * 2;
  const gridHeight = canvas.height - gridY - 48;
  const headerHeight = 58;
  const rowCount = Math.max(5, data.days.length / 7);
  const colWidth = gridWidth / 7;
  const rowHeight = (gridHeight - headerHeight) / rowCount;

  ctx.fillStyle = "#172033";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '800 42px -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif';
  ctx.fillText(data.title, canvas.width / 2, titleY);

  fillRoundRect(ctx, gridX, gridY, gridWidth, gridHeight, 18, "#ffffff");
  strokeRoundRect(ctx, gridX, gridY, gridWidth, gridHeight, 18, "#dde3ee", 3);

  ctx.save();
  drawRoundRect(ctx, gridX, gridY, gridWidth, gridHeight, 18);
  ctx.clip();

  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(gridX, gridY, gridWidth, headerHeight);

  data.weekdays.forEach((day, index) => {
    ctx.fillStyle = index === 0 ? "#dc2626" : index === 6 ? "#2563eb" : "#667085";
    ctx.font = '800 20px -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(day, gridX + colWidth * index + colWidth / 2, gridY + headerHeight / 2 + 1);
  });

  ctx.strokeStyle = "#dde3ee";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(gridX, gridY + headerHeight);
  ctx.lineTo(gridX + gridWidth, gridY + headerHeight);
  ctx.stroke();

  for (let col = 1; col < 7; col++) {
    const x = gridX + colWidth * col;
    ctx.beginPath();
    ctx.moveTo(x, gridY + headerHeight);
    ctx.lineTo(x, gridY + gridHeight);
    ctx.stroke();
  }

  for (let row = 1; row < rowCount; row++) {
    const y = gridY + headerHeight + rowHeight * row;
    ctx.beginPath();
    ctx.moveTo(gridX, y);
    ctx.lineTo(gridX + gridWidth, y);
    ctx.stroke();
  }

  data.days.forEach((day, index) => {
    if (day.empty) return;
    const col = index % 7;
    const row = Math.floor(index / 7);
    const x = gridX + colWidth * col;
    const y = gridY + headerHeight + rowHeight * row;

    ctx.fillStyle = day.holiday || day.weekday === 0 ? "#dc2626" : day.weekday === 6 ? "#2563eb" : "#172033";
    ctx.font = '800 24px -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(String(day.day), x + colWidth / 2, y + 14);

    const maxLabels = Math.min(day.items.length, 4);
    const labelX = x + 12;
    const labelWidth = colWidth - 24;
    const labelStartY = y + 54;
    const labelGap = 8;

    for (let i = 0; i < maxLabels; i++) {
      const item = day.items[i];
      drawPdfLabel(ctx, item.label, labelX, labelStartY + i * (24 + labelGap), labelWidth, item.bgColor, item.textColor);
    }

    if (day.items.length > maxLabels) {
      drawPdfLabel(ctx, `+${day.items.length - maxLabels}`, labelX, labelStartY + maxLabels * (24 + labelGap), labelWidth, "#e5e7eb", "#667085");
    }
  });

  ctx.restore();
  return canvas;
}

async function saveMonthCanvasesPdf(canvases, filename) {
  const PdfCtor = await getJsPdfCtor();
  const pdf = new PdfCtor({
    unit: "px",
    format: [PDF_CANVAS_WIDTH, PDF_CANVAS_HEIGHT],
    orientation: "landscape",
    compress: true
  });

  canvases.forEach((canvas, index) => {
    if (index > 0) pdf.addPage([PDF_CANVAS_WIDTH, PDF_CANVAS_HEIGHT], "landscape");
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.94), "JPEG", 0, 0, PDF_CANVAS_WIDTH, PDF_CANVAS_HEIGHT);
  });

  downloadPdf(pdf, filename);
}

function downloadPdf(pdf, filename) {
  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function exportCurrentMonthPdf() {
  if (isExporting) return;
  isExporting = true;
  const filename = `53-calendar-${currentDate.getFullYear()}-${pad2(currentDate.getMonth() + 1)}.pdf`;

  try {
    await waitForNextFrame();
    const canvas = createMonthPdfCanvas(currentDate);
    await saveMonthCanvasesPdf([canvas], filename);
  } catch (err) {
    console.error(err);
    alert("PDF の生成に失敗しました。時間をおいてもう一度お試しください。");
  } finally {
    isExporting = false;
  }
}

async function exportWholeYearPdf() {
  if (isExporting) return;
  isExporting = true;
  const backupDate = new Date(currentDate);
  const year = backupDate.getFullYear();

  try {
    const canvases = [];

    for (let month = 0; month < 12; month++) {
      canvases.push(createMonthPdfCanvas(startOfDay(new Date(year, month, 1))));
      await waitForNextFrame();
    }

    await saveMonthCanvasesPdf(canvases, `53-calendar-${year}-12months.pdf`);
  } catch (err) {
    console.error(err);
    alert("年間 PDF の生成に失敗しました。時間をおいてもう一度お試しください。");
  } finally {
    currentDate = backupDate;
    renderCalendar();
    isExporting = false;
  }
}

function init() {
  const state = loadState();
  types = state.types;
  rules = state.rules;
  persistState();

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
