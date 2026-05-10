const ET_ZONE = "America/New_York";
const CN_ZONE = "Asia/Shanghai";

const HOLIDAYS = {
  "2026-01-01": "New Year's Day",
  "2026-01-19": "Martin Luther King Jr. Day",
  "2026-02-16": "Washington's Birthday",
  "2026-04-03": "Good Friday",
  "2026-05-25": "Memorial Day",
  "2026-06-19": "Juneteenth",
  "2026-07-03": "Independence Day observed",
  "2026-09-07": "Labor Day",
  "2026-11-26": "Thanksgiving Day",
  "2026-12-25": "Christmas Day",
  "2027-01-01": "New Year's Day",
  "2027-01-18": "Martin Luther King Jr. Day",
  "2027-02-15": "Washington's Birthday",
  "2027-03-26": "Good Friday",
  "2027-05-31": "Memorial Day",
  "2027-06-18": "Juneteenth observed",
  "2027-07-05": "Independence Day observed",
  "2027-09-06": "Labor Day",
  "2027-11-25": "Thanksgiving Day",
  "2027-12-24": "Christmas Day observed",
  "2028-01-17": "Martin Luther King Jr. Day",
  "2028-02-21": "Washington's Birthday",
  "2028-04-14": "Good Friday",
  "2028-05-29": "Memorial Day",
  "2028-06-19": "Juneteenth",
  "2028-07-04": "Independence Day",
  "2028-09-04": "Labor Day",
  "2028-11-23": "Thanksgiving Day",
  "2028-12-25": "Christmas Day",
};

const EARLY_CLOSES = {
  "2026-11-27": "Thanksgiving 后一日，13:00 提前收盘",
  "2026-12-24": "Christmas Eve，13:00 提前收盘",
  "2027-11-26": "Thanksgiving 后一日，13:00 提前收盘",
  "2028-07-03": "Independence Day 前一日，13:00 提前收盘",
  "2028-11-24": "Thanksgiving 后一日，13:00 提前收盘",
};

const els = {
  autoNow: document.querySelector("#autoNow"),
  timeTravel: document.querySelector("#timeTravel"),
  jumpNow: document.querySelector("#jumpNow"),
  statusDot: document.querySelector("#statusDot"),
  phaseLabel: document.querySelector("#phaseLabel"),
  primaryStatus: document.querySelector("#primaryStatus"),
  statusDetail: document.querySelector("#statusDetail"),
  eventLabel: document.querySelector("#eventLabel"),
  eventCountdown: document.querySelector("#eventCountdown"),
  localClock: document.querySelector("#localClock"),
  chinaClock: document.querySelector("#chinaClock"),
  newYorkClock: document.querySelector("#newYorkClock"),
  dstNote: document.querySelector("#dstNote"),
  exchangeDate: document.querySelector("#exchangeDate"),
  todayVerdict: document.querySelector("#todayVerdict"),
  holidayNote: document.querySelector("#holidayNote"),
  timelineRange: document.querySelector("#timelineRange"),
  timelineNow: document.querySelector("#timelineNow"),
  segmentPremarket: document.querySelector("#segmentPremarket"),
  segmentRegular: document.querySelector("#segmentRegular"),
  segmentAfterhours: document.querySelector("#segmentAfterhours"),
  sessionList: document.querySelector("#sessionList"),
  upcomingList: document.querySelector("#upcomingList"),
  calendarTitle: document.querySelector("#calendarTitle"),
  calendarGrid: document.querySelector("#calendarGrid"),
  utcNote: document.querySelector("#utcNote"),
};

const formatters = new Map();
let manualInstant = new Date();

function getFormatter(timeZone, options) {
  const key = `${timeZone}-${JSON.stringify(options)}`;
  if (!formatters.has(key)) {
    formatters.set(key, new Intl.DateTimeFormat("zh-CN", { timeZone, ...options }));
  }
  return formatters.get(key);
}

function getZonedParts(date, timeZone) {
  const formatter = getFormatter(timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday,
  };
}

function zoneOffsetMs(date, timeZone) {
  const parts = getZonedParts(date, timeZone);
  const zoneAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return zoneAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

function formatUtcOffset(date, timeZone) {
  const offsetHours = zoneOffsetMs(date, timeZone) / 60 / 60 / 1000;
  const sign = offsetHours >= 0 ? "+" : "";
  return `UTC${sign}${offsetHours}`;
}

function zonedTimeToUtc(timeZone, year, month, day, hour, minute = 0, second = 0) {
  const target = Date.UTC(year, month - 1, day, hour, minute, second);
  let utc = target;
  for (let i = 0; i < 3; i += 1) {
    utc = target - zoneOffsetMs(new Date(utc), timeZone);
  }
  return new Date(utc);
}

function keyFromParts(parts) {
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function parseKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}

function addDaysToKey(key, days) {
  const { year, month, day } = parseKey(key);
  return new Date(Date.UTC(year, month - 1, day + days, 12)).toISOString().slice(0, 10);
}

function weekdayIndexForKey(key) {
  const { year, month, day } = parseKey(key);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function dayInfo(key) {
  const weekday = weekdayIndexForKey(key);
  const holiday = HOLIDAYS[key];
  const early = EARLY_CLOSES[key];
  return {
    key,
    weekday,
    isWeekend: weekday === 0 || weekday === 6,
    isHoliday: Boolean(holiday),
    isEarlyClose: Boolean(early),
    holiday,
    early,
    isClosed: weekday === 0 || weekday === 6 || Boolean(holiday),
  };
}

function sessionsForKey(key) {
  const info = dayInfo(key);
  if (info.isClosed) return [];
  const { year, month, day } = parseKey(key);
  const regularCloseHour = info.isEarlyClose ? 13 : 16;
  const afterCloseHour = info.isEarlyClose ? 17 : 20;
  return [
    {
      id: "premarket",
      name: "盘前",
      start: zonedTimeToUtc(ET_ZONE, year, month, day, 4),
      end: zonedTimeToUtc(ET_ZONE, year, month, day, 9, 30),
      primary: false,
    },
    {
      id: "regular",
      name: "常规交易",
      start: zonedTimeToUtc(ET_ZONE, year, month, day, 9, 30),
      end: zonedTimeToUtc(ET_ZONE, year, month, day, regularCloseHour),
      primary: true,
    },
    {
      id: "afterhours",
      name: "盘后",
      start: zonedTimeToUtc(ET_ZONE, year, month, day, regularCloseHour),
      end: zonedTimeToUtc(ET_ZONE, year, month, day, afterCloseHour),
      primary: false,
    },
  ];
}

function currentState(now) {
  const etParts = getZonedParts(now, ET_ZONE);
  const key = keyFromParts(etParts);
  const info = dayInfo(key);
  const sessions = sessionsForKey(key);
  const active = sessions.find((session) => now >= session.start && now < session.end);

  if (active) {
    return {
      key,
      info,
      sessions,
      phase: active.id,
      active,
      nextLabel:
        active.id === "premarket" ? "距常规开盘" : active.id === "regular" ? "距常规收盘" : "距盘后结束",
      nextAt: active.id === "premarket" ? sessions[1].start : active.end,
    };
  }

  if (!info.isClosed && sessions.length && now < sessions[0].start) {
    return {
      key,
      info,
      sessions,
      phase: "closed",
      active: null,
      nextLabel: "距盘前开始",
      nextAt: sessions[0].start,
    };
  }

  const next = nextTradingKey(addDaysToKey(key, now < zonedStartOfDay(key) ? 0 : 1));
  const nextSessions = sessionsForKey(next);
  return {
    key,
    info,
    sessions,
    phase: "closed",
    active: null,
    nextLabel: "距下个交易日盘前",
    nextAt: nextSessions[0].start,
    nextKey: next,
  };
}

function zonedStartOfDay(key) {
  const { year, month, day } = parseKey(key);
  return zonedTimeToUtc(ET_ZONE, year, month, day, 0);
}

function nextTradingKey(startKey) {
  let key = startKey;
  for (let i = 0; i < 900; i += 1) {
    if (!dayInfo(key).isClosed) return key;
    key = addDaysToKey(key, 1);
  }
  return startKey;
}

function formatClock(date, timeZone, withDate = false) {
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  };
  if (withDate) {
    options.month = "2-digit";
    options.day = "2-digit";
  }
  return getFormatter(timeZone, options).format(date);
}

function formatDateKey(key, timeZone = ET_ZONE) {
  const { year, month, day } = parseKey(key);
  const date = zonedTimeToUtc(timeZone, year, month, day, 12);
  return getFormatter(timeZone, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function formatSessionTime(date, timeZone) {
  return getFormatter(timeZone, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function nextRegularReferenceKey(now, state) {
  if (!state.info.isClosed) {
    const regular = sessionsForKey(state.key)[1];
    if (regular && now < regular.end) return state.key;
    return nextTradingKey(addDaysToKey(state.key, 1));
  }
  return nextTradingKey(state.key);
}

function phaseCopy(state) {
  if (state.phase === "regular") {
    return {
      dot: "open",
      phase: "常规交易中",
      primary: "美股正在交易",
      detail: state.info.isEarlyClose ? "今天是半日市，常规交易纽约时间 13:00 收盘。" : "NYSE / Nasdaq 常规交易时段开放。",
    };
  }
  if (state.phase === "premarket") {
    return {
      dot: "extended",
      phase: "盘前时段",
      primary: "常规交易未开",
      detail: "盘前流动性通常较低，具体可交易范围以你的券商为准。",
    };
  }
  if (state.phase === "afterhours") {
    return {
      dot: "extended",
      phase: "盘后时段",
      primary: "常规交易已收",
      detail: state.info.isEarlyClose ? "半日市盘后可能缩短，订单规则以券商为准。" : "盘后交易开放到纽约时间 20:00，具体以券商为准。",
    };
  }
  if (state.info.isHoliday) {
    return {
      dot: "",
      phase: "休市日",
      primary: "今天不交易",
      detail: `纽约交易所休市：${state.info.holiday}。`,
    };
  }
  if (state.info.isWeekend) {
    return {
      dot: "",
      phase: "周末",
      primary: "今天不交易",
      detail: "美股周六、周日不进行常规交易。",
    };
  }
  return {
    dot: "",
    phase: "未开盘",
    primary: "当前休市",
    detail: "今天是交易日，但当前不在交易时段内。",
  };
}

function updateStatus(now, state) {
  const copy = phaseCopy(state);
  els.statusDot.className = `status-dot ${copy.dot}`.trim();
  els.phaseLabel.textContent = copy.phase;
  els.primaryStatus.textContent = copy.primary;
  els.statusDetail.textContent = copy.detail;
  els.eventLabel.textContent = state.nextLabel;
  els.eventCountdown.textContent = formatDuration(state.nextAt - now);

  els.localClock.textContent = formatClock(now, Intl.DateTimeFormat().resolvedOptions().timeZone);
  els.chinaClock.textContent = formatClock(now, CN_ZONE);
  els.newYorkClock.textContent = formatClock(now, ET_ZONE);

  const tzName = getFormatter(ET_ZONE, { timeZoneName: "short" })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value;
  const nextRegularKey = nextRegularReferenceKey(now, state);
  const cnRegular = sessionsForKey(nextRegularKey)[1];
  els.dstNote.textContent = `ET 是美国东部时间；当前纽约为 ${tzName || "ET"}。常规交易对应北京时间 ${formatSessionTime(cnRegular.start, CN_ZONE)} - ${formatSessionTime(cnRegular.end, CN_ZONE)}。`;
  els.utcNote.textContent = `北京时间：UTC+8；纽约时间：${formatUtcOffset(now, ET_ZONE)}（随美国夏令时变化，夏令时 UTC-4，冬令时 UTC-5）。`;

  els.exchangeDate.textContent = formatDateKey(state.key);
  els.todayVerdict.className = `verdict ${state.info.isClosed ? "" : state.info.isEarlyClose ? "early" : "open"}`.trim();
  els.todayVerdict.textContent = state.info.isClosed ? "纽约今天休市" : state.info.isEarlyClose ? "纽约今天半日市" : "纽约今天交易";
  els.holidayNote.textContent = state.info.isHoliday
    ? state.info.holiday
    : state.info.isEarlyClose
      ? state.info.early
      : state.info.isWeekend
        ? "以纽约日期判断，不是北京时间自然日。"
        : "常规交易为纽约时间 09:30 - 16:00。";
}

function updateSessions(state, now) {
  const sessions = state.sessions.length ? state.sessions : sessionsForKey(state.nextKey || nextTradingKey(state.key));
  els.sessionList.innerHTML = sessions
    .map((session) => {
      const cn = `${formatSessionTime(session.start, CN_ZONE)} - ${formatSessionTime(session.end, CN_ZONE)}`;
      const et = `${formatSessionTime(session.start, ET_ZONE)} - ${formatSessionTime(session.end, ET_ZONE)}`;
      return `<div class="session"><b>${session.name}</b><span>北京时间 ${cn}</span><span>纽约时间 ${et}</span></div>`;
    })
    .join("");

  const dayStartHour = 4;
  const dayEndHour = state.info.isEarlyClose ? 17 : 20;
  const total = dayEndHour - dayStartHour;
  els.timelineRange.textContent = `纽约时间 ${String(dayStartHour).padStart(2, "0")}:00 - ${String(dayEndHour).padStart(2, "0")}:00`;

  const setSegment = (el, startHour, endHour) => {
    const left = ((startHour - dayStartHour) / total) * 100;
    const width = ((endHour - startHour) / total) * 100;
    el.style.left = `${left}%`;
    el.style.width = `${width}%`;
  };
  setSegment(els.segmentPremarket, 4, 9.5);
  setSegment(els.segmentRegular, 9.5, state.info.isEarlyClose ? 13 : 16);
  setSegment(els.segmentAfterhours, state.info.isEarlyClose ? 13 : 16, dayEndHour);

  const etParts = getZonedParts(now, ET_ZONE);
  const currentHour = etParts.hour + etParts.minute / 60 + etParts.second / 3600;
  const nowPosition = ((currentHour - dayStartHour) / total) * 100;
  els.timelineNow.style.left = `${Math.max(0, Math.min(100, nowPosition))}%`;
  els.timelineNow.style.opacity = nowPosition >= 0 && nowPosition <= 100 && state.key === keyFromParts(etParts) ? "1" : "0";
}

function updateUpcoming(state) {
  const days = [];
  let key = state.nextKey || (state.info.isClosed ? nextTradingKey(state.key) : state.key);
  for (let i = 0; days.length < 6 && i < 40; i += 1) {
    const info = dayInfo(key);
    if (!info.isClosed) {
      const sessions = sessionsForKey(key);
      days.push({ key, info, regular: sessions[1] });
    }
    key = addDaysToKey(key, 1);
  }

  els.upcomingList.innerHTML = days
    .map((item) => {
      const cnTime = `${formatSessionTime(item.regular.start, CN_ZONE)} - ${formatSessionTime(item.regular.end, CN_ZONE)}`;
      const nyTime = `${formatSessionTime(item.regular.start, ET_ZONE)} - ${formatSessionTime(item.regular.end, ET_ZONE)}`;
      const earlyBadge = item.info.isEarlyClose ? "<em>半日市</em>" : "";
      return `<div class="upcoming-day"><b>${formatDateKey(item.key)}</b><div class="upcoming-times"><span><strong>北京时间</strong><time>${cnTime}</time></span><span><strong>纽约时间</strong><time>${nyTime}</time>${earlyBadge}</span></div></div>`;
    })
    .join("");
}

function updateCalendar(state) {
  const { year, month } = parseKey(state.key);
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const firstWeekday = weekdayIndexForKey(monthStart);
  const startKey = addDaysToKey(monthStart, -firstWeekday);
  const monthLabel = getFormatter(ET_ZONE, { year: "numeric", month: "long" }).format(
    zonedTimeToUtc(ET_ZONE, year, month, 1, 12),
  );
  els.calendarTitle.textContent = `${monthLabel}（纽约）`;

  const cells = [];
  for (let i = 0; i < 42; i += 1) {
    const key = addDaysToKey(startKey, i);
    const info = dayInfo(key);
    const { day, month: cellMonth } = parseKey(key);
    const labels = [];
    if (info.isHoliday) labels.push("休");
    if (info.isEarlyClose) labels.push("半日");
    const classes = [
      "calendar-day",
      cellMonth !== month ? "outside" : "",
      key === state.key ? "today" : "",
      info.isHoliday || info.isWeekend ? "closed" : "",
      info.isEarlyClose ? "early" : "",
    ]
      .filter(Boolean)
      .join(" ");
    cells.push(`<div class="${classes}"><strong>${day}</strong>${labels.map((label) => `<small>${label}</small>`).join("")}</div>`);
  }
  els.calendarGrid.innerHTML = cells.join("");
}

function toInputValue(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getActiveInstant() {
  return els.autoNow.checked ? new Date() : manualInstant;
}

function render() {
  const now = getActiveInstant();
  const state = currentState(now);
  updateStatus(now, state);
  updateSessions(state, now);
  updateUpcoming(state);
  updateCalendar(state);
  if (els.autoNow.checked) {
    els.timeTravel.value = toInputValue(now);
  }
}

els.autoNow.addEventListener("change", () => {
  if (!els.autoNow.checked) manualInstant = new Date(els.timeTravel.value || new Date());
  render();
});

els.timeTravel.addEventListener("change", () => {
  els.autoNow.checked = false;
  manualInstant = new Date(els.timeTravel.value);
  render();
});

els.jumpNow.addEventListener("click", () => {
  els.autoNow.checked = true;
  manualInstant = new Date();
  render();
});

render();
setInterval(render, 1000);
