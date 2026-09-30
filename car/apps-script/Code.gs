/**
 * 만기콕 백엔드 — Google 스프레드시트 + Apps Script (무료)
 *
 * 하는 일
 *  1) 웹페이지에서 보낸 차량 등록 / 상담 신청을 시트에 저장
 *  2) 상담 신청이 들어오면 FC에게 즉시 이메일
 *  3) 매일 아침 9시, 만기 30일·7일 전 고객 목록을 FC에게 이메일
 *     (연락 수신에 동의한 고객만 포함)
 *
 * 설치 방법은 README.md 참고
 */

const FC_EMAIL = "여기에-FC-이메일@gmail.com"; // ← 알림 받을 이메일로 변경
const SHEET_CARS = "차량등록";
const SHEET_CONSULT = "상담신청";
const NOTIFY_DAYS = [30, 7]; // 만기 며칠 전에 알릴지

const CAR_HEADERS = ["등록시각", "이름", "휴대폰", "차량번호", "보험만기일", "검사만료일", "엔진오일교체일", "필수동의", "연락수신동의", "유입경로", "소개코드(받은)", "내소개코드", "메모"];
const CONSULT_HEADERS = ["신청시각", "상태", "이름", "휴대폰", "상담주제", "연락방법", "희망시간", "남긴말", "등록차량", "필수동의", "유입경로", "소개코드(받은)"];

/** 최초 1회 실행: 시트와 매일 알림 트리거를 만듭니다. */
function setup() {
  const ss = SpreadsheetApp.getActive();
  [[SHEET_CARS, CAR_HEADERS], [SHEET_CONSULT, CONSULT_HEADERS]].forEach(([name, headers]) => {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold").setBackground("#E8EFFF");
    sh.setFrozenRows(1);
  });
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("dailyDigest").timeBased().everyDays(1).atHour(9).inTimezone("Asia/Seoul").create();
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    const t = d.tracking || {};
    const source = [t.utm_source, t.utm_medium, t.utm_campaign].filter(Boolean).join(" / ") || "직접";
    const ss = SpreadsheetApp.getActive();

    if (d.type === "register") {
      if (!/^01\d-?\d{3,4}-?\d{4}$/.test(clean(d.phone)) || !clean(d.plate)) return json({ ok: false });
      ss.getSheetByName(SHEET_CARS).appendRow([
        new Date(), clean(d.name), clean(d.phone), clean(d.plate), clean(d.insuranceDate), clean(d.inspectionDate),
        clean(d.oilDate), clean(d.consentRequired), clean(d.consentContact), source, clean(t.ref), clean(d.refCode), "",
      ]);
    } else if (d.type === "consult") {
      if (!/^01\d-?\d{3,4}-?\d{4}$/.test(clean(d.phone))) return json({ ok: false });
      const row = [
        new Date(), "신규", clean(d.name), clean(d.phone), clean(d.topics), clean(d.method), clean(d.time),
        clean(d.memo, 300), clean(d.plates), clean(d.consentRequired), source, clean(t.ref),
      ];
      ss.getSheetByName(SHEET_CONSULT).appendRow(row);
      MailApp.sendEmail({
        to: FC_EMAIL,
        subject: `[만기콕] 새 상담 신청 — ${row[2] || "이름 없음"} (${row[4]})`,
        body: [
          `이름: ${row[2]}`, `휴대폰: ${row[3]}`, `상담 주제: ${row[4]}`, `연락 방법: ${row[5]}`,
          `희망 시간: ${row[6]}`, `남긴 말: ${row[7] || "-"}`, `등록 차량: ${row[8] || "-"}`, `유입 경로: ${row[10]}`,
          "", `시트 열기: ${ss.getUrl()}`,
        ].join("\n"),
      });
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false });
  } finally {
    lock.releaseLock();
  }
}

/** 매일 9시: 만기 30일·7일 전 고객 목록 이메일 */
function dailyDigest() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_CARS);
  const rows = sh.getDataRange().getValues().slice(1);
  const today = startOfDay(new Date());
  const hits = [];

  rows.forEach((r) => {
    if (r[8] !== "Y") return; // 연락 수신 동의 고객만
    const name = r[1], phone = r[2], plate = r[3];
    const ins = toDate(r[4]);
    if (ins) {
      const next = nextYearly(ins, today);
      const n = daysBetween(today, next);
      if (NOTIFY_DAYS.includes(n)) hits.push(`🛡️ 보험만기 D-${n} | ${name || "-"} | ${phone} | ${plate} | ${fmt(next)}`);
    }
    const insp = toDate(r[5]);
    if (insp) {
      const n = daysBetween(today, insp);
      if (NOTIFY_DAYS.includes(n)) hits.push(`🔧 검사만료 D-${n} | ${name || "-"} | ${phone} | ${plate} | ${fmt(insp)}`);
    }
  });

  if (!hits.length) return;
  MailApp.sendEmail({
    to: FC_EMAIL,
    subject: `[만기콕] 오늘 연락할 고객 ${hits.length}명`,
    body: ["오늘 먼저 연락드릴 고객입니다. (연락 수신 동의 고객만)", "", ...hits, "", SpreadsheetApp.getActive().getUrl()].join("\n"),
  });
}

/* ---------- 도우미 ---------- */
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function clean(v, max) {
  let s = String(v == null ? "" : v).trim().slice(0, max || 60);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // 스프레드시트 수식 삽입 방지
  return s;
}
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function toDate(v) {
  if (v instanceof Date) return startOfDay(v);
  const m = String(v || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
function nextYearly(d, today) { const r = new Date(d); while (r < today) r.setFullYear(r.getFullYear() + 1); return r; }
function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
function fmt(d) { return Utilities.formatDate(d, "Asia/Seoul", "yyyy.MM.dd"); }
