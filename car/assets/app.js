/* 만기콕 공통 스크립트 */
(function () {
  "use strict";
  const C = window.MANGIKOK_CONFIG;
  const KEY_CARS = "mangikok.vehicles";
  const KEY_PROFILE = "mangikok.profile";
  const KEY_TRACK = "mangikok.track";
  const DAY = 86400000;

  /* ---------- 유입 경로 추적 (UTM / 소개 코드) ---------- */
  function captureTracking() {
    const q = new URLSearchParams(location.search);
    const keys = ["utm_source", "utm_medium", "utm_campaign", "ref"];
    const saved = JSON.parse(localStorage.getItem(KEY_TRACK) || "{}");
    let changed = false;
    keys.forEach((k) => {
      if (q.get(k) && !saved[k]) { saved[k] = q.get(k).slice(0, 60); changed = true; }
    });
    if (!saved.first_page) { saved.first_page = location.pathname; saved.first_at = new Date().toISOString(); changed = true; }
    if (changed) localStorage.setItem(KEY_TRACK, JSON.stringify(saved));
    return saved;
  }
  const tracking = captureTracking();

  /* ---------- 로컬 저장소 ---------- */
  const store = {
    cars: () => JSON.parse(localStorage.getItem(KEY_CARS) || "[]"),
    saveCars: (list) => localStorage.setItem(KEY_CARS, JSON.stringify(list)),
    profile: () => JSON.parse(localStorage.getItem(KEY_PROFILE) || "{}"),
    saveProfile: (p) => localStorage.setItem(KEY_PROFILE, JSON.stringify({ ...store.profile(), ...p })),
  };

  function myRefCode() {
    const p = store.profile();
    if (p.refCode) return p.refCode;
    const code = Math.random().toString(36).slice(2, 8);
    store.saveProfile({ refCode: code });
    return code;
  }

  /* ---------- 서버 전송 (Google Apps Script) ---------- */
  async function send(type, data) {
    const payload = { type, ...data, tracking, page: location.pathname, sentAt: new Date().toISOString() };
    if (!C.endpoint) {
      console.info("[만기콕 미리보기 모드] 서버 주소가 없어 전송하지 않았습니다.", payload);
      return { ok: true, preview: true };
    }
    await fetch(C.endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    return { ok: true };
  }

  /* ---------- 날짜 ---------- */
  function parseDate(s) {
    if (!s) return null;
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function today() { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
  function fmt(d) { return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; }
  function ymd(d) { return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; }
  function addMonths(d, n) { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }
  function daysUntil(d) { return Math.round((d - today()) / DAY); }
  // 보험 만기는 매년 돌아오므로, 지난 날짜면 다음 해로 넘깁니다.
  function nextYearly(d) { const r = new Date(d); while (r < today()) r.setFullYear(r.getFullYear() + 1); return r; }

  function schedule(car) {
    const items = [];
    const ins = parseDate(car.insuranceDate);
    if (ins) items.push({ key: "insurance", title: "자동차보험 만기", date: nextYearly(ins), note: "만기 30일 전부터 비교해보세요" });
    const insp = parseDate(car.inspectionDate);
    if (insp) items.push({ key: "inspection", title: "자동차 검사 만료", date: insp, note: "만료일 전후 31일 이내 검사" });
    const oil = parseDate(car.oilDate);
    if (oil) {
      let next = addMonths(oil, 6);
      items.push({ key: "oil", title: "엔진오일 교체 권장", date: next, note: "마지막 교체 후 6개월 기준" });
    }
    return items.sort((a, b) => a.date - b.date);
  }

  /* ---------- 달력 등록 ---------- */
  function icsFor(car, item) {
    const start = ymd(item.date);
    const end = ymd(new Date(item.date.getTime() + DAY));
    const title = `[만기콕] ${car.plate} ${item.title}`;
    const desc = `${item.note}\\n담당: ${C.fcName} (${C.company})`;
    const alarm = (trigger) => ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${title}`, `TRIGGER:${trigger}`, "END:VALARM"];
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//mangikok//KO", "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${car.id}-${item.key}@mangikok`,
      `DTSTAMP:${ymd(new Date())}T000000Z`,
      `DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${title}`, `DESCRIPTION:${desc}`,
      ...(item.key === "insurance" ? ["RRULE:FREQ=YEARLY"] : []),
      ...alarm("-P30D"), ...alarm("-P7D"), ...alarm("-P1D"),
      "END:VEVENT", "END:VCALENDAR",
    ];
    return lines.join("\r\n");
  }
  function downloadIcs(car, item) {
    const blob = new Blob([icsFor(car, item)], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mangikok-${item.key}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function googleCalUrl(car, item) {
    const p = new URLSearchParams({
      action: "TEMPLATE",
      text: `[만기콕] ${car.plate} ${item.title}`,
      dates: `${ymd(item.date)}/${ymd(new Date(item.date.getTime() + DAY))}`,
      details: `${item.note}\n담당: ${C.fcName} (${C.company})`,
    });
    if (item.key === "insurance") p.set("recur", "RRULE:FREQ=YEARLY");
    return `https://calendar.google.com/calendar/render?${p}`;
  }

  /* ---------- 검증 ---------- */
  const normPlate = (s) => (s || "").replace(/\s|-/g, "");
  const isPlate = (s) => /^([가-힣]{2})?\d{2,3}[가-힣]\d{4}$/.test(normPlate(s));
  const normPhone = (s) => (s || "").replace(/\D/g, "");
  const isPhone = (s) => /^01[016789]\d{7,8}$/.test(normPhone(s));
  const fmtPhone = (s) => { const d = normPhone(s); return d.length === 11 ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`; };

  function setInvalid(el, bad) { el.classList.toggle("invalid", !!bad); return !bad; }

  /* ---------- UI 공통 ---------- */
  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2600);
  }

  async function share() {
    const url = new URL("index.html", location.href);
    url.searchParams.set("ref", myRefCode());
    url.searchParams.set("utm_source", "share");
    const data = { title: `${C.appName} — 자동차 만기 알림`, text: "자동차보험·검사 만기일, 이제 잊지 마세요. 무료로 챙겨줘요.", url: url.toString() };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(`${data.text}\n${data.url}`);
      toast("링크를 복사했어요. 카카오톡에 붙여넣어 보내주세요.");
    } catch (e) { if (e && e.name !== "AbortError") toast("공유하지 못했어요. 다시 시도해주세요."); }
  }

  function applyConfig() {
    document.querySelectorAll("[data-config]").forEach((el) => { const v = C[el.dataset.config]; if (v) el.textContent = v; });
    document.querySelectorAll("[data-feature]").forEach((el) => { if (!C.features[el.dataset.feature]) el.remove(); });
    document.querySelectorAll("[data-href]").forEach((el) => {
      const v = C[el.dataset.href];
      if (v) el.href = v; else el.remove();
    });
    document.querySelectorAll(".fc-photo").forEach((img) => {
      img.alt = `${C.fcName} FC`;
      img.addEventListener("error", () => {
        const d = document.createElement("div"); d.className = "fc-avatar"; d.textContent = C.fcName.slice(0, 1); img.replaceWith(d);
      });
    });
    document.querySelectorAll("[data-share]").forEach((b) => b.addEventListener("click", share));
    renderFooter();
  }

  function renderFooter() {
    const f = document.querySelector("footer .wrap");
    if (!f) return;
    f.innerHTML = `
      <p><b>${C.appName}</b> · 담당 ${C.fcName} FC</p>
      <p>${C.company} ${C.branch} · 보험설계사 등록번호 ${C.registrationNo}</p>
      ${C.reviewNo ? `<p>${C.reviewNo}</p>` : ""}
      <p><a href="privacy.html">개인정보처리방침</a> · <a href="${C.homeUrl}">상담 페이지</a></p>`;
  }

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  window.MK = { C, store, send, schedule, daysUntil, fmt, downloadIcs, googleCalUrl, normPlate, isPlate, normPhone, isPhone, fmtPhone, setInvalid, toast, share, applyConfig, myRefCode };
  document.addEventListener("DOMContentLoaded", applyConfig);
})();
