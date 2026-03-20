import "./style.css";
import { INVITE } from "./config.js";

const $ = (sel) => document.querySelector(sel);
const encode = (s) => encodeURIComponent(String(s ?? ""));
const pad2 = (n) => String(n).padStart(2, "0");

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

function forceScrollTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function scheduleScrollTopReset() {
  forceScrollTop();
  requestAnimationFrame(forceScrollTop);
  setTimeout(forceScrollTop, 60);
}

window.addEventListener("pageshow", scheduleScrollTopReset);

// ✅ Kakao
const KAKAO_JS_KEY = "950d726b2979c7f8113c72f6fbfb8771";
const KAKAO_TEMPLATE_ID = 129829;

// ✅ Guestbook endpoint (Apps Script Web App URL)
const GUESTBOOK_ENDPOINT = INVITE.GUESTBOOK_ENDPOINT;
const GUESTBOOK_TS_CACHE_KEY = "__guestbookTsCacheV1";
const HIDDEN_GUESTBOOK_ENTRIES = new Set([
  "codex-test::ping",
  "codex-ip-test::ping",
  "codex-cors-test::ping",
]);

function toast(msg) {
  let el = document.getElementById("__toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "__toast";
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "18px";
    el.style.transform = "translateX(-50%)";
    el.style.padding = "10px 12px";
    el.style.borderRadius = "12px";
    el.style.background = "rgba(0,0,0,0.75)";
    el.style.color = "white";
    el.style.fontSize = "13px";
    el.style.zIndex = "999";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = "block";
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => (el.style.display = "none"), 1700);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("복사했어요!");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    toast("복사했어요!");
  }
}

function ensureKakaoInit() {
  if (!window.Kakao) return false;
  try {
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(KAKAO_JS_KEY);
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

/** ✅ 티맵: 앱 호출(실패하면 토스트) */
function openTmap({ name, lat, lng }) {
  const nameEnc = encode(name);
  const url1 = `tmap://route?rGoName=${nameEnc}&rGoX=${lng}&rGoY=${lat}`;
  const url2 = `tmap://route?goalname=${nameEnc}&goalx=${lng}&goaly=${lat}`;

  const tryOpen = (url) =>
    new Promise((resolve) => {
      const start = Date.now();
      window.location.href = url;
      setTimeout(() => resolve(Date.now() - start), 650);
    });

  (async () => {
    const t1 = await tryOpen(url1);
    if (t1 < 1100) {
      const t2 = await tryOpen(url2);
      if (t2 < 1100) toast("티맵 앱이 설치되어 있지 않거나, 호출이 차단됐어요.");
    }
  })();
}

/* ===== 모달 열릴 때 뒤 스크롤 잠금 ===== */
let __scrollY = 0;
function lockScroll() {
  __scrollY = window.scrollY || 0;
  document.body.style.position = "fixed";
  document.body.style.top = `-${__scrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}
function unlockScroll() {
  const top = document.body.style.top;
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  window.scrollTo(0, Math.abs(parseInt(top || "0", 10)));
}
function preventTouchMove(e) { e.preventDefault(); }

const INTRO_SCROLL_KEYS = new Set([
  " ",
  "Spacebar",
  "PageDown",
  "PageUp",
  "ArrowDown",
  "ArrowUp",
  "Home",
  "End",
]);
const INTRO_SCROLL_EVENT_OPTIONS = { passive: false };
const INTRO_SCROLL_TARGETS = [window, document];

let __introScrollLocked = false;

function preventIntroScrollKey(e) {
  if (!INTRO_SCROLL_KEYS.has(e.key)) return;
  e.preventDefault();
}

function keepIntroScrollTop() {
  if (!__introScrollLocked) return;
  if ((window.scrollY || window.pageYOffset || 0) !== 0) {
    window.scrollTo(0, 0);
  }
}

function setIntroBodyLock(locked) {
  document.body.style.position = locked ? "fixed" : "";
  document.body.style.inset = locked ? "0" : "";
  document.body.style.width = locked ? "100%" : "";
  document.body.style.overflow = locked ? "hidden" : "";
}

function setIntroScrollLock(locked) {
  if (__introScrollLocked === locked) return;
  __introScrollLocked = locked;

  document.documentElement.classList.toggle("is-intro-locked", locked);
  document.body.classList.toggle("is-intro-locked", locked);

  const method = locked ? "addEventListener" : "removeEventListener";
  INTRO_SCROLL_TARGETS.forEach((target) => {
    target[method]("wheel", preventTouchMove, INTRO_SCROLL_EVENT_OPTIONS);
    target[method]("touchmove", preventTouchMove, INTRO_SCROLL_EVENT_OPTIONS);
    target[method]("keydown", preventIntroScrollKey, INTRO_SCROLL_EVENT_OPTIONS);
  });
  window[method]("scroll", keepIntroScrollTop, INTRO_SCROLL_EVENT_OPTIONS);

  setIntroBodyLock(locked);
  window.scrollTo(0, 0);

  if (locked) {
    requestAnimationFrame(keepIntroScrollTop);
  }
}

function formatTime(ts) {
  const normalizedTs = normalizeGuestbookTimestamp(ts);
  if (!normalizedTs) return "";

  const d = new Date(normalizedTs);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yy}.${mm}.${dd} ${hh}:${mi}:${ss}`;
}

/* ===== Guestbook ===== */
function hasGuestbookEndpoint() {
  return typeof GUESTBOOK_ENDPOINT === "string" && GUESTBOOK_ENDPOINT.trim().length > 0;
}

async function gbFetchList() {
  const url = `${GUESTBOOK_ENDPOINT}?action=list&_=${Date.now()}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`Guestbook list failed: ${res.status}`);
  return await res.json();
}

async function gbAddItem(name, msg) {
  const res = await fetch(GUESTBOOK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    redirect: "follow",
    body: JSON.stringify({ action: "add", name, msg }),
  });
  if (!res.ok) throw new Error(`Guestbook add failed: ${res.status}`);
  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error("Guestbook add failed: invalid json");
  }
  if (!json?.ok) throw new Error(`Guestbook add failed: ${json?.error || "unknown"}`);
  return json;
}

function isHiddenGuestbookEntry(item) {
  const key = `${String(item?.name || "").trim()}::${String(item?.msg || "").trim()}`;
  return HIDDEN_GUESTBOOK_ENTRIES.has(key);
}

function isHeaderGuestbookEntry(item) {
  const name = String(item?.name || "").trim().toLowerCase();
  const msg = String(item?.msg || "").trim().toLowerCase();
  return name === "name" && msg === "msg";
}

function normalizeGuestbookTimestamp(rawValue) {
  if (typeof rawValue === "number") {
    return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : null;
  }

  const value = String(rawValue ?? "").trim();
  if (!value) return null;

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getGuestbookCacheKey(item) {
  return `${String(item?.name || "").trim()}::${String(item?.msg || "").trim()}`;
}

function readGuestbookTimestampCache() {
  try {
    const raw = window.localStorage.getItem(GUESTBOOK_TS_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeGuestbookTimestampCache(cache) {
  try {
    window.localStorage.setItem(GUESTBOOK_TS_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

function rememberGuestbookTimestamp(item) {
  const ts = normalizeGuestbookTimestamp(item?.ts);
  const key = getGuestbookCacheKey(item);
  if (!ts || !key) return;

  const cache = readGuestbookTimestampCache();
  cache[key] = ts;
  writeGuestbookTimestampCache(cache);
}

function fillGuestbookTimestamp(item, fallbackMap) {
  const normalizedTs = normalizeGuestbookTimestamp(item?.ts);
  if (normalizedTs) {
    const nextItem = { ...item, ts: normalizedTs };
    rememberGuestbookTimestamp(nextItem);
    return nextItem;
  }

  const key = getGuestbookCacheKey(item);
  const fallbackTs = normalizeGuestbookTimestamp(fallbackMap[key]);
  return fallbackTs ? { ...item, ts: fallbackTs } : item;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getWeddingDateParts(dateTimeISO) {
  const match = String(dateTimeISO || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function getDatePartsInTimeZone(date, timeZone = "Asia/Seoul") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = {};
  parts.forEach(({ type, value }) => {
    if (type !== "literal") values[type] = value;
  });

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function getWeddingDdayContent(dateTimeISO) {
  const parts = getWeddingDateParts(dateTimeISO);
  if (!parts) return { html: "", text: "" };

  const today = getDatePartsInTimeZone(new Date(), "Asia/Seoul");
  const todayUTC = Date.UTC(today.year, today.month - 1, today.day);
  const weddingUTC = Date.UTC(parts.year, parts.month - 1, parts.day);
  const diffDays = Math.round((weddingUTC - todayUTC) / 86400000);

  if (diffDays > 0) {
    return {
      html: `<span class="calendarCountdown__valueLead">D-${diffDays}</span><span class="calendarCountdown__valueTail">일 남았습니다.</span>`,
      text: `D-${diffDays} 일 남았습니다.`,
    };
  }
  if (diffDays === 0) return { html: "오늘입니다!", text: "오늘입니다!" };
  return {
    html: `${Math.abs(diffDays)}일이 지났습니다.`,
    text: `${Math.abs(diffDays)}일이 지났습니다.`,
  };
}

function buildWeddingCalendar(dateTimeISO) {
  const parts = getWeddingDateParts(dateTimeISO);
  if (!parts) return "";

  const { year, month, day } = parts;
  const weekLabels = ["일", "월", "화", "수", "목", "금", "토"];
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const lastDate = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(`<div class="calendarGrid__cell calendarGrid__cell--empty" aria-hidden="true"></div>`);
  }

  for (let date = 1; date <= lastDate; date += 1) {
    const isWeddingDay = date === day;
    cells.push(`
      <div class="calendarGrid__cell${isWeddingDay ? " is-wedding" : ""}" role="gridcell" aria-label="${month}월 ${date}일${isWeddingDay ? " 예식일" : ""}">
        ${isWeddingDay
          ? `
        <span class="calendarGrid__heart">
          <span class="calendarGrid__heartContent">
            <span class="calendarGrid__date">${date}</span>
            <span class="calendarGrid__badge">D-day</span>
          </span>
        </span>`
          : `<span class="calendarGrid__date">${date}</span>`}
      </div>
    `);
  }

  while (cells.length % 7 !== 0) {
    cells.push(`<div class="calendarGrid__cell calendarGrid__cell--empty" aria-hidden="true"></div>`);
  }

  return `
    <div class="calendarBox">
      <div class="calendarHead">
        <div class="calendarHead__month">${year}.${pad2(month)}</div>
      </div>
      <div class="calendarGrid" role="grid" aria-label="${year}년 ${month}월 결혼식 달력">
        ${weekLabels.map((label, idx) => `
          <div class="calendarGrid__weekday${idx === 0 ? " is-sun" : ""}${idx === 6 ? " is-sat" : ""}" role="columnheader">${label}</div>
        `).join("")}
        ${cells.join("")}
      </div>
    </div>
  `;
}

/* ===== 손글씨를 줄 단위로 필기하듯 구성 ===== */
function buildWritePhrase(el, text) {
  el.innerHTML = "";
  const lines = text.split("\n");

  lines.forEach((line, lineIdx) => {
    const lineEl = document.createElement("span");
    const textEl = document.createElement("span");
    const duration = Math.max(760, line.replaceAll(" ", "").length * 92);

    lineEl.className = "writeLine";
    textEl.className = "writeLine__text";
    textEl.textContent = line || "\u00a0";
    lineEl.style.setProperty("--line-delay", `${lineIdx * 680}ms`);
    lineEl.style.setProperty("--line-duration", `${duration}ms`);
    textEl.addEventListener("animationend", () => {
      textEl.style.animation = "none";
      textEl.style.opacity = "1";
      textEl.style.transform = "translateY(0)";
      textEl.style.filter = "blur(0)";
      textEl.style.clipPath = "none";
      textEl.style.webkitClipPath = "none";
    }, { once: true });
    lineEl.appendChild(textEl);
    el.appendChild(lineEl);
  });
}

function activateWritePhrase(el) {
  el.classList.add("is-write");
}

function waitForIntroFont(timeoutMs = 1800) {
  if (!document.fonts?.load) return Promise.resolve();

  const fontReady = Promise.all([
    document.fonts.load('1em "Northwell"'),
    document.fonts.ready,
  ]).catch(() => {});

  const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));
  return Promise.race([fontReady, timeout]);
}

function build() {
  scheduleScrollTopReset();

  const d = INVITE;

  const inviteTitle = "소중한 사람을 초대합니다.";
  const inviteKickerLine1 = "Locked in for life.";
  const inviteKickerLine2 = "Forever starts now";
  const inviteQuote = `"서로의 하루를 구독하던 우리,\n이제는 평생 자동 연장됩니다"`;
  const inviteBodyLine1 = "함께하면 더 편하고 더 즐거운 사람이 되어";
  const inviteBodyLine2 = "평생을 함께하기로 했습니다.";
  const inviteBodyLine3 = "저희의 시작이 되는 봄";
  const inviteBodyLine4 = "따뜻한 축복으로 함께해주세요.";
  const ceremonyDateText = d.wedding.dateText.replace(/\. /g, ".");
  const weddingCalendar = buildWeddingCalendar(d.wedding.dateTimeISO);
  const weddingDdayContent = getWeddingDdayContent(d.wedding.dateTimeISO);
  const introImage = d.heroPolaroids[0] || d.heroImage;

  const bride = d.couple.bride;
  const groom = d.couple.groom;

  const brideSms = `${bride.phone}?&body=${encode(`${bride.name}에게 축하 메시지를 남겨주세요 🙂`)}`;
  const groomSms = `${groom.phone}?&body=${encode(`${groom.name}에게 축하 메시지를 남겨주세요 🙂`)}`;

  const { lat, lng } = d.wedding;

  const naverSearchUrl = `https://map.naver.com/v5/search/${encode(d.wedding.venueName)}?c=${lng},${lat},15,0,0,0,dh`;
  const kakaoPlaceUrl = `https://map.kakao.com/link/map/${encode(d.wedding.venueName)},${lat},${lng}`;
  const kakaoRouteUrl = `https://map.kakao.com/link/to/${encode(d.wedding.venueName)},${lat},${lng}`;

  $("#app").innerHTML = `
  <div class="intro" id="intro" aria-hidden="false">
    <div class="introStage">
      <div class="introCanvas">
        <div class="introHero">
          <img class="introHero__img" src="${introImage}" alt="intro" decoding="async" fetchpriority="high">
        </div>
        <div class="writePhrase" id="writePhrase" aria-label="we getting married"></div>
        <div class="writeName" id="writeName" aria-label="lee jae gi and jeong da som"></div>
      </div>
    </div><!-- /introStage -->
  </div><!-- /intro -->

  <main class="wrap" id="main" style="opacity:0;">
    <div class="heroCard">
      <img class="heroImg" src="${d.heroImage}" alt="hero" loading="eager" decoding="async" fetchpriority="high"/>
      <div class="heroMeta">
        <div class="heroMeta__names">${groom.name} · ${bride.name}</div>
        <div class="heroMeta__info">
          <b>${d.wedding.dateText}</b><br/>
          ${d.wedding.venueName}
          <div class="muted" style="margin-top:6px;">${d.wedding.address}</div>
        </div>
      </div>
    </div>

    <section class="card card--invite">
      <div class="inviteIntro">
        <div class="inviteKicker">
          <span>${inviteKickerLine1}</span>
          <span>${inviteKickerLine2}</span>
        </div>
        <p class="message">
          <span class="messageQuote">${inviteQuote}</span>
        </p>
      </div>
      <h2 class="card__title">${inviteTitle}</h2>
      <p class="message message--body">
        <span class="messageLead">
          <span>${inviteBodyLine1}</span>
          <span>${inviteBodyLine2}</span>
          <span>${inviteBodyLine3}</span>
          <span>${inviteBodyLine4}</span>
        </span>
      </p>

      <div class="inviteContacts">
        <div class="row inviteContactRow">
          <span class="inviteContactText">유순덕의 아들&nbsp;&nbsp;&nbsp;<b>${groom.name}</b></span>
          <a class="contactIcon" href="sms:${groomSms}" aria-label="${groom.name}에게 문자 보내기">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6.5h16a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 17.5H4A1.5 1.5 0 0 1 2.5 16V8A1.5 1.5 0 0 1 4 6.5Z" />
              <path d="m4 8 8 6 8-6" />
            </svg>
          </a>
        </div>

        <div class="row inviteContactRow">
          <span class="inviteContactText">정대연 · 장영화의 딸&nbsp;&nbsp;&nbsp;<b>${bride.name}</b></span>
          <a class="contactIcon" href="sms:${brideSms}" aria-label="${bride.name}에게 문자 보내기">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 6.5h16a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 17.5H4A1.5 1.5 0 0 1 2.5 16V8A1.5 1.5 0 0 1 4 6.5Z" />
              <path d="m4 8 8 6 8-6" />
            </svg>
          </a>
        </div>
      </div>
      <p class="inviteContactsNote">문자 버튼을 누르시면 신랑 신부에게 축하메세지를 전달할 수 있습니다.</p>
    </section>

    <section class="card card--ceremony">
      <h2 class="card__title">예식 안내</h2>
      <div class="ceremonyInfo">
        <div class="ceremonyInfo__date"><b>${ceremonyDateText}</b></div>
        <div class="ceremonyInfo__venue"><b>${d.wedding.venueName}</b></div>
        <div class="ceremonyInfo__address">${d.wedding.address}</div>
      </div>
      <div class="grid2 ceremonyActions">
        <button class="btn" id="calGoogleBtn" type="button">📅 구글 캘린더</button>
        <a class="btn" id="calAppleBtn" href="/wedding.ics">🍎 애플 캘린더</a>
      </div>
    </section>

    <section class="card card--gallery">
      <h2 class="card__title">갤러리</h2>
      <div class="galleryWrap">
        <div class="gallery gallery--wedding" id="weddingGallery"></div>
      </div>
    </section>

    <section class="card card--calendar">
      ${weddingCalendar}
      <div class="calendarCountdown">
        <div class="calendarCountdown__title">다솜 ♥ 재기의 결혼식</div>
        <div class="calendarCountdown__value" id="weddingDday" aria-label="${escapeHtml(weddingDdayContent.text)}">${weddingDdayContent.html}</div>
      </div>
    </section>

    <section class="card card--location">
      <h2 class="card__title">오시는 길</h2>

      <div class="grid2 locationActions">
        <a class="btn" href="${naverSearchUrl}" target="_blank" rel="noopener">네이버지도 위치</a>
        <button class="btn" id="naverRouteBtn" type="button">네이버지도 길찾기</button>
      </div>

      <div class="grid2" style="margin-top:10px;">
        <a class="btn" href="${kakaoPlaceUrl}" target="_blank" rel="noopener">카카오맵 위치</a>
        <a class="btn" href="${kakaoRouteUrl}" target="_blank" rel="noopener">카카오맵 길찾기</a>
      </div>

      <div class="locationTmapWrap">
        <button class="btn" id="tmapBtn" type="button" style="width:100%;">티맵 길찾기</button>
      </div>

      <div class="locationGuide">
        <div class="locationGuide__group">
          <div class="locationGuide__label">지하철</div>
          <div class="locationGuide__text">공덕역 7,10번 출구 도보 2분(5호선, 6호선, 공항철도, 경의중앙선)</div>
        </div>
        <div class="locationGuide__group">
          <div class="locationGuide__label">버스</div>
          <div class="locationGuide__text">간선 : 160 / 260 / 600  지선 : 7013A / 7013B / 7611<br>공항버스 : 6015, 6021<br>공덕역 하차 220m 이내 건물</div>
        </div>
        <div class="locationGuide__group">
          <div class="locationGuide__label">자차</div>
          <div class="locationGuide__text">서울시 마포구 마포대로 92 효성해링턴스퀘어<br>건물 내 주차 가능<br><br><b>예식장 규정에 따라 화환 반입이 불가하여<br>마음만 감사히 받겠습니다.<br>(리본띠만 받습니다.)</b></div>
        </div>
      </div>
    </section>

    <section class="card card--gift">
      <h2 class="card__title">마음 전하실 곳</h2>
      <p class="muted giftIntro">
        함께하지 못하시더라도<br>
        마음만은 가까이 전해주실 분들을 위해 계좌번호를 안내드립니다.<br>
        전해주시는 모든 마음에 깊이 감사드리며,<br>
        두 사람의 시작을 더욱 따뜻하게 간직하겠습니다.
      </p>

      <div class="accGroup">
        <button class="accGroup__toggle accGroup__toggle--groom" id="groomAccToggle" type="button">
          <span>신랑측</span>
          <span class="accGroup__arrow" id="groomArrow">▾</span>
        </button>
        <div class="accGroup__body" id="groomAccBody">
          <div class="accRow">
            <div class="accRow__info">
              <span class="accRow__name">신랑</span>
              <span class="accRow__number">1000-0126-3854</span>
              <span class="accRow__bank">토스뱅크 이재기</span>
            </div>
            <div class="accRow__btns">
              <button class="btn btn--mini accCopyBtn" type="button" data-copy="토스뱅크 1000-0126-3854 (이재기)">복사</button>
              <a class="btn btn--kakaopay" href="https://qr.kakaopay.com/Ej8DZxnJE" target="_blank" rel="noopener">
                💙 카카오페이
              </a>
            </div>
          </div>
          <div class="accRow">
            <div class="accRow__info">
              <span class="accRow__name">신랑 어머니</span>
              <span class="accRow__number">1002748770753</span>
              <span class="accRow__bank">우리은행 유순덕</span>
            </div>
            <button class="btn btn--mini accCopyBtn" type="button" data-copy="우리은행 1002748770753 (유순덕)">복사</button>
          </div>
        </div>
      </div>

      <div class="accGroup" style="margin-top:8px;">
        <button class="accGroup__toggle accGroup__toggle--bride" id="brideAccToggle" type="button">
          <span>신부측</span>
          <span class="accGroup__arrow" id="brideArrow">▾</span>
        </button>
        <div class="accGroup__body" id="brideAccBody">
          <div class="accRow">
            <div class="accRow__info">
              <span class="accRow__name">신부</span>
              <span class="accRow__number">3333-01-4592141</span>
              <span class="accRow__bank">카카오뱅크 정다솜</span>
            </div>
            <div class="accRow__btns">
              <button class="btn btn--mini accCopyBtn" type="button" data-copy="카카오뱅크 3333-01-4592141 (정다솜)">복사</button>
              <a class="btn btn--kakaopay" href="https://qr.kakaopay.com/Ej9NAytiq" target="_blank" rel="noopener">
                🩷 카카오페이
              </a>
            </div>
          </div>
          <div class="accRow">
            <div class="accRow__info">
              <span class="accRow__name">신부 아버지</span>
              <span class="accRow__number">821113-56-143912</span>
              <span class="accRow__bank">농협은행 정대연</span>
            </div>
            <button class="btn btn--mini accCopyBtn" type="button" data-copy="농협은행 821113-56-143912 (정대연)">복사</button>
          </div>
          <div class="accRow">
            <div class="accRow__info">
              <span class="accRow__name">신부 어머니</span>
              <span class="accRow__number">596401-01-357009</span>
              <span class="accRow__bank">국민은행 장영화</span>
            </div>
            <button class="btn btn--mini accCopyBtn" type="button" data-copy="국민은행 596401-01-357009 (장영화)">복사</button>
          </div>
        </div>
      </div>
    </section>

    <section class="card card--guestbook">
      <h2 class="card__title">방명록</h2>
      <p class="muted guestbookIntro">신랑과 신부에게 축하의 메세지를 남겨주세요! 💌</p>
      <form id="gbForm" class="guestbookForm">
        <input id="gbName" class="input" maxlength="20" placeholder="작성자" required />
        <textarea id="gbMsg" class="textarea" maxlength="300" placeholder="내용" required></textarea>
        <button class="btn btn--primary" type="submit" style="width:100%;">남기기</button>
      </form>
      <div id="gbList" class="gbList"></div>
      <button id="gbMore" class="btn" type="button" style="width:100%; margin-top:10px; display:none;">더보기</button>
      <p class="muted" id="gbHint" style="margin-top:10px; font-size:12px; line-height:1.5;"></p>
    </section>

    <section class="card card--rsvp">
      <h2 class="card__title">참석 여부 확인</h2>
      <p class="muted" style="margin:10px 0 12px; line-height:1.6;">구글폼으로 참석 여부를 남겨주세요.</p>
      <a class="btn btn--primary" target="_blank" rel="noopener" href="${d.rsvpUrl}" style="width:100%;">참석 여부 남기기</a>
    </section>

    <section class="card card--share">
      <h2 class="card__title">청첩장 공유하기</h2>
      <p class="muted" style="margin:10px 0 12px; line-height:1.6;">카카오톡으로 예쁜 청첩장을 전해보세요.</p>
      <button id="kakaoShareBtn" class="btn" style="background-color:#FEE500; color:#000; border:none; font-weight:bold; width:100%; border-radius:14px;">
        카카오톡 공유하기
      </button>
    </section>

    <footer class="footer">${d.footerText}</footer>

    <div id="modal" class="modal" aria-hidden="true">
      <div class="modal__backdrop"></div>
      <div class="modal__counter" id="modalCounter">1/1</div>
      <button class="modal__close" id="modalClose" type="button" aria-label="닫기">&times;</button>
      <button class="modal__nav modal__nav--prev" id="modalPrev" type="button" aria-label="이전 사진">‹</button>
      <img class="modal__img" id="modalImg" alt="modal" />
      <button class="modal__nav modal__nav--next" id="modalNext" type="button" aria-label="다음 사진">›</button>
    </div>
  </main>
  `;

  /* ===== INTRO timing ===== */
  const intro = $("#intro");
  const main = $("#main");
  const writePhrase = document.getElementById("writePhrase");
  const writeName = document.getElementById("writeName");

  if (intro) setIntroScrollLock(true);

  // 손글씨 문구를 먼저 구성하고 위에서 아래 순서로 재생한다.
  if (writePhrase) buildWritePhrase(writePhrase, "we getting\nmarried!!!");
  if (writeName) buildWritePhrase(writeName, "lee jae gi\n&\njeong da som");

  const startIntroSequence = () => {
    if (writePhrase) setTimeout(() => activateWritePhrase(writePhrase), 260);
    if (writeName) setTimeout(() => activateWritePhrase(writeName), 1780);

    setTimeout(() => {
      if (intro) {
        intro.classList.add("is-hide");
        intro.setAttribute("aria-hidden", "true");
        setTimeout(() => setIntroScrollLock(false), 650);
      } else {
        setIntroScrollLock(false);
      }
      if (main) {
        main.style.transition = "opacity 450ms ease";
        main.style.opacity = "1";
      }
      scheduleGalleryRender();
    }, 4700);
  };

  waitForIntroFont().then(startIntroSequence);

  /* ===== Gallery (웨딩만) ===== */
  const weddingEl = $("#weddingGallery");
  const GALLERY_WARMUP_COUNT = 8;
  const GALLERY_EAGER_RENDER_COUNT = 6;
  let galleryWarmupStarted = false;

  function warmWeddingGallery() {
    if (galleryWarmupStarted) return;
    galleryWarmupStarted = true;

    const sources = d.weddingGallery.slice(0, GALLERY_WARMUP_COUNT);
    if (!sources.length) return;

    const MAX_PARALLEL_WARMUPS = 3;
    let nextIndex = 0;
    let activeCount = 0;

    const pump = () => {
      while (activeCount < MAX_PARALLEL_WARMUPS && nextIndex < sources.length) {
        const src = sources[nextIndex];
        nextIndex += 1;
        activeCount += 1;

        const img = new Image();
        img.decoding = "async";
        if ("fetchPriority" in img) {
          img.fetchPriority = "low";
        }

        const finish = () => {
          activeCount -= 1;
          pump();
        };

        img.addEventListener("load", finish, { once: true });
        img.addEventListener("error", finish, { once: true });
        img.src = src;
      }
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(pump, { timeout: 800 });
      return;
    }

    setTimeout(pump, 120);
  }

  warmWeddingGallery();

  /* ===== Modal slider ===== */
  const modal = $("#modal");
  const modalImg = $("#modalImg");
  const modalPrev = $("#modalPrev");
  const modalNext = $("#modalNext");
  const modalCounter = $("#modalCounter");
  const modalClose = $("#modalClose");

  let currentList = [];
  let currentIndex = 0;
  let zoomScale = 1;
  let panX = 0;
  let panY = 0;

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 4;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function clampModalPan() {
    const width = modalImg.offsetWidth || 0;
    const height = modalImg.offsetHeight || 0;
    const maxX = Math.max(0, (width * zoomScale - width) / 2);
    const maxY = Math.max(0, (height * zoomScale - height) / 2);

    panX = clamp(panX, -maxX, maxX);
    panY = clamp(panY, -maxY, maxY);
  }

  function applyModalTransform() {
    modalImg.style.transform = `translate3d(${panX}px, ${panY}px, 0) scale(${zoomScale})`;
    modalImg.classList.toggle("is-zoomed", zoomScale > 1.001);
  }

  function resetModalZoom() {
    zoomScale = 1;
    panX = 0;
    panY = 0;
    applyModalTransform();
  }

  function setModalZoom(nextScale) {
    zoomScale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);

    if (zoomScale <= 1.001) {
      zoomScale = 1;
      panX = 0;
      panY = 0;
    } else {
      clampModalPan();
    }

    applyModalTransform();
  }

  function renderModal() {
    resetModalZoom();
    const currentSrc = currentList[currentIndex];
    modalImg.src = currentSrc;
    modalCounter.textContent = `${currentIndex + 1}/${currentList.length}`;

    const prevDisabled = currentIndex <= 0;
    const nextDisabled = currentIndex >= currentList.length - 1;

    modalPrev.disabled = prevDisabled;
    modalNext.disabled = nextDisabled;

    modalPrev.style.opacity = prevDisabled ? "0.35" : "1";
    modalNext.style.opacity = nextDisabled ? "0.35" : "1";
    modalPrev.style.pointerEvents = prevDisabled ? "none" : "auto";
    modalNext.style.pointerEvents = nextDisabled ? "none" : "auto";
  }

  function openModal(list, index) {
    currentList = list;
    currentIndex = index;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");

    lockScroll();
    renderModal();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    modalImg.src = "";
    touchMode = "none";
    pDown = false;
    pId = null;
    pMode = "swipe";
    modalImg.style.cursor = "";
    resetModalZoom();
    unlockScroll();
  }

  function prev() {
    if (currentIndex > 0) {
      currentIndex -= 1;
      renderModal();
    }
  }
  function next() {
    if (currentIndex < currentList.length - 1) {
      currentIndex += 1;
      renderModal();
    }
  }

  modal.addEventListener("click", (e) => {
    const isBackdrop = e.target.classList.contains("modal__backdrop") || e.target === modal;
    if (isBackdrop) closeModal();
  });

  modalPrev.addEventListener("click", (e) => { e.stopPropagation(); prev(); });
  modalNext.addEventListener("click", (e) => { e.stopPropagation(); next(); });
  modalClose.addEventListener("click", (e) => { e.stopPropagation(); closeModal(); });
  modalImg.addEventListener("click", (e) => e.stopPropagation());

  window.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("is-open")) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  });

  /* ===== Swipe ===== */
  const SWIPE_THRESHOLD_PX = 48;
  let __swipeFiredAt = 0;
  const fireSwipeOnce = (fn) => {
    const now = Date.now();
    if (now - __swipeFiredAt < 260) return;
    __swipeFiredAt = now;
    fn();
  };

  function handleSwipe(dx, dy) {
    if (zoomScale > 1.001) return;
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (ax < SWIPE_THRESHOLD_PX) return;
    if (ax < ay * 1.2) return;
    if (dx < 0) fireSwipeOnce(next);
    else fireSwipeOnce(prev);
  }

  const getTouchDistance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  let touchMode = "none";
  let tStartX = 0;
  let tStartY = 0;
  let tLastX = 0;
  let tLastY = 0;
  let pinchStartDistance = 0;
  let pinchStartScale = 1;

  const beginSwipeTouch = (t) => {
    touchMode = "swipe";
    tStartX = t.clientX;
    tStartY = t.clientY;
    tLastX = t.clientX;
    tLastY = t.clientY;
  };

  const beginPanTouch = (t) => {
    touchMode = "pan";
    tLastX = t.clientX;
    tLastY = t.clientY;
  };

  const beginPinchTouch = (a, b) => {
    touchMode = "pinch";
    pinchStartDistance = Math.max(getTouchDistance(a, b), 1);
    pinchStartScale = zoomScale;
  };

  modalImg.addEventListener(
    "touchstart",
    (e) => {
      if (!modal.classList.contains("is-open")) return;
      if (e.touches.length === 2) {
        beginPinchTouch(e.touches[0], e.touches[1]);
        e.preventDefault();
        return;
      }

      const t = e.touches?.[0];
      if (!t) return;

      if (zoomScale > 1.001) beginPanTouch(t);
      else beginSwipeTouch(t);
    },
    { passive: false }
  );
  modalImg.addEventListener(
    "touchmove",
    (e) => {
      if (!modal.classList.contains("is-open")) return;

      if (e.touches.length === 2) {
        if (touchMode !== "pinch") {
          beginPinchTouch(e.touches[0], e.touches[1]);
        }

        const nextDistance = Math.max(getTouchDistance(e.touches[0], e.touches[1]), 1);
        setModalZoom(pinchStartScale * (nextDistance / pinchStartDistance));
        e.preventDefault();
        return;
      }

      const t = e.touches?.[0];
      if (!t) return;

      if (zoomScale > 1.001) {
        if (touchMode !== "pan") beginPanTouch(t);

        panX += t.clientX - tLastX;
        panY += t.clientY - tLastY;
        tLastX = t.clientX;
        tLastY = t.clientY;
        clampModalPan();
        applyModalTransform();
        e.preventDefault();
      }
    },
    { passive: false }
  );
  modalImg.addEventListener(
    "touchend",
    (e) => {
      if (!modal.classList.contains("is-open")) return;

      if (touchMode === "pinch" && e.touches.length === 1 && zoomScale > 1.001) {
        beginPanTouch(e.touches[0]);
        return;
      }

      if (touchMode === "swipe" && zoomScale === 1) {
        const t = e.changedTouches?.[0];
        if (t) handleSwipe(t.clientX - tStartX, t.clientY - tStartY);
      }

      if (e.touches.length === 0) touchMode = "none";
    },
    { passive: true }
  );
  modalImg.addEventListener("touchcancel", () => { touchMode = "none"; });

  let pDown = false;
  let pId = null;
  let pMode = "swipe";
  let pStartX = 0;
  let pStartY = 0;
  let pLastX = 0;
  let pLastY = 0;
  let pDx = 0;
  let pDy = 0;

  modalImg.addEventListener("pointerdown", (e) => {
    if (!modal.classList.contains("is-open")) return;
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    pDown = true;
    pId = e.pointerId;
    pMode = zoomScale > 1.001 ? "pan" : "swipe";
    pStartX = e.clientX;
    pStartY = e.clientY;
    pLastX = e.clientX;
    pLastY = e.clientY;
    pDx = 0;
    pDy = 0;
    if (pMode === "pan") modalImg.style.cursor = "grabbing";
    try { modalImg.setPointerCapture?.(e.pointerId); } catch {}
  });
  modalImg.addEventListener("pointermove", (e) => {
    if (!pDown) return;
    if (pId !== null && e.pointerId !== pId) return;

    if (pMode === "pan" && zoomScale > 1.001) {
      panX += e.clientX - pLastX;
      panY += e.clientY - pLastY;
      pLastX = e.clientX;
      pLastY = e.clientY;
      clampModalPan();
      applyModalTransform();
      return;
    }

    pDx = e.clientX - pStartX;
    pDy = e.clientY - pStartY;
  });
  const endPointer = (e) => {
    if (!pDown) return;
    if (pId !== null && e.pointerId !== pId) return;
    if (pMode === "swipe") handleSwipe(pDx, pDy);
    pDown = false;
    pId = null;
    pMode = "swipe";
    modalImg.style.cursor = "";
    pDx = 0;
    pDy = 0;
  };
  modalImg.addEventListener("pointerup", endPointer);
  modalImg.addEventListener("pointercancel", endPointer);
  modalImg.addEventListener(
    "wheel",
    (e) => {
      if (!modal.classList.contains("is-open")) return;
      e.preventDefault();
      const zoomStep = e.deltaY < 0 ? 0.24 : -0.24;
      setModalZoom(zoomScale + zoomStep);
    },
    { passive: false }
  );
  modalImg.addEventListener("load", () => {
    clampModalPan();
    applyModalTransform();
  });

  function renderWeddingGallery() {
    if (!weddingEl || weddingEl.childElementCount > 0) return;

    d.weddingGallery.forEach((src, i) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = `wedding-${i + 1}`;
      img.loading = i < GALLERY_EAGER_RENDER_COUNT ? "eager" : "lazy";
      img.decoding = "async";
      img.fetchPriority = i < 3 ? "high" : i < GALLERY_EAGER_RENDER_COUNT ? "auto" : "low";
      img.addEventListener("click", () => openModal(d.weddingGallery, i));
      weddingEl.appendChild(img);
    });
  }

  const scheduleGalleryRender = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(renderWeddingGallery, { timeout: 1200 });
      return;
    }
    setTimeout(renderWeddingGallery, 500);
  };


  /* ===== Accounts accordion ===== */
  function setupAccordion(toggleId, bodyId, arrowId) {
    const toggle = document.getElementById(toggleId);
    const body = document.getElementById(bodyId);
    const arrow = document.getElementById(arrowId);
    if (!toggle || !body) return;
    // 기본 닫힘
    body.style.maxHeight = "0";
    body.style.overflow = "hidden";
    body.style.transition = "max-height 350ms ease";
    arrow.style.display = "inline-block";
    arrow.style.transition = "transform 300ms ease";
    let open = false;
    toggle.addEventListener("click", () => {
      open = !open;
      body.style.maxHeight = open ? body.scrollHeight + "px" : "0";
      arrow.style.transform = open ? "rotate(180deg)" : "rotate(0deg)";
    });
  }
  setupAccordion("groomAccToggle", "groomAccBody", "groomArrow");
  setupAccordion("brideAccToggle", "brideAccBody", "brideArrow");

  // 복사 버튼
  document.querySelectorAll(".accCopyBtn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyText(btn.dataset.copy);
    });
  });

  /* ===== 캘린더 추가 ===== */
  const calGoogleBtn = $("#calGoogleBtn");
  const calAppleBtn  = $("#calAppleBtn");

  const weddingISO   = d.wedding.dateTimeISO;           // "2026-05-31T14:00:00+09:00"
  const weddingEnd   = "2026-05-31T15:30:00+09:00";    // 예식 종료 (약 1시간 30분 후)
  const calTitle     = encodeURIComponent("이재기 ♡ 정다솜 결혼식");
  const calLocation  = encodeURIComponent(d.wedding.address);
  const calDetails   = encodeURIComponent(d.wedding.venueName);

  // 구글 캘린더용 날짜 포맷 (UTC, YYYYMMDDTHHmmssZ)
  function toGCal(isoStr) {
    return new Date(isoStr).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  if (calGoogleBtn) {
    calGoogleBtn.addEventListener("click", () => {
      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE`
        + `&text=${calTitle}`
        + `&dates=${toGCal(weddingISO)}/${toGCal(weddingEnd)}`
        + `&location=${calLocation}`
        + `&details=${calDetails}`;
      window.open(url, "_blank", "noopener");
    });
  }

  if (calAppleBtn) {
    calAppleBtn.addEventListener("click", () => {
      // 카카오톡 인앱 브라우저/iOS에서 Blob 다운로드가 막히는 경우가 있어 정적 ICS로 직접 이동한다.
      window.location.href = calAppleBtn.getAttribute("href") || "/wedding.ics";
    });
  }

  /* ===== 지도 버튼 동작 ===== */
  const naverRouteBtn = $("#naverRouteBtn");
  if (naverRouteBtn) {
    naverRouteBtn.addEventListener("click", () => {
      const naverApp = `nmap://route/public?dlat=${lat}&dlng=${lng}&dname=${encode(d.wedding.venueName)}&appname=invite`;
      const start = Date.now();
      window.location.href = naverApp;
      setTimeout(() => {
        if (Date.now() - start < 1200) window.open(naverSearchUrl, "_blank", "noopener");
      }, 700);
    });
  }

  const tmapBtn = $("#tmapBtn");
  if (tmapBtn) {
    tmapBtn.addEventListener("click", () => openTmap({ name: d.wedding.venueName, lat, lng }));
  }

  /* ===== Kakao share ===== */
  const kakaoBtn = $("#kakaoShareBtn");
  if (kakaoBtn) {
    kakaoBtn.addEventListener("click", async () => {
      try {
        const ok = ensureKakaoInit();
        if (!ok) {
          toast("카카오 SDK 로딩 실패 (콘솔 확인)");
          return;
        }
        await window.Kakao.Share.sendCustom({ templateId: KAKAO_TEMPLATE_ID });
      } catch (e) {
        console.error(e);
        toast("카카오 공유 오류 (콘솔 확인)");
      }
    });
  }

  /* ===== Guestbook ===== */
  const gbListEl = $("#gbList");
  const gbMoreBtn = $("#gbMore");
  const gbHint = $("#gbHint");
  const gbForm = $("#gbForm");
  const gbName = $("#gbName");
  const gbMsg = $("#gbMsg");
  const gbSubmitBtn = gbForm?.querySelector('button[type="submit"]');
  const weddingDdayEl = $("#weddingDday");

  const GB_INITIAL_VISIBLE = 5;
  let __gbAll = [];
  let __gbVisible = GB_INITIAL_VISIBLE;
  let __gbSubmitting = false;

  function setGuestbookSubmitting(submitting) {
    __gbSubmitting = submitting;
    if (!gbSubmitBtn) return;
    gbSubmitBtn.disabled = submitting;
    gbSubmitBtn.textContent = submitting ? "남기는 중..." : "남기기";
  }

  function updateGbMoreBtn() {
    if (!gbMoreBtn) return;
    const remaining = Math.max(0, __gbAll.length - __gbVisible);
    if (remaining <= 0) {
      gbMoreBtn.style.display = "none";
      return;
    }

    gbMoreBtn.style.display = "inline-flex";
    gbMoreBtn.textContent = `더보기 (+${remaining}개)`;
  }

  function paintGB() {
    gbListEl.innerHTML = "";

    if (!__gbAll.length) {
      gbListEl.innerHTML = `<div class="muted" style="padding:10px 2px;">아직 방명록이 없어요 🙂</div>`;
      updateGbMoreBtn();
      return;
    }

    __gbAll.slice(0, __gbVisible).forEach((it) => {
      const div = document.createElement("div");
      div.className = "gbItem";
      const timeText = formatTime(it.ts);
      div.innerHTML = `
        <div class="gbMeta">
          <div class="gbName">${escapeHtml(it.name)}</div>
          ${timeText ? `<div class="gbTime">${timeText}</div>` : ""}
        </div>
        <div class="gbMsg">${escapeHtml(it.msg)}</div>
      `;
      gbListEl.appendChild(div);
    });

    updateGbMoreBtn();
  }

  function renderGB(items) {
    const wasExpanded = __gbAll.length > GB_INITIAL_VISIBLE && __gbVisible >= __gbAll.length;
    const cachedTimestamps = readGuestbookTimestampCache();
    __gbAll.forEach((item) => {
      const ts = normalizeGuestbookTimestamp(item?.ts);
      const key = getGuestbookCacheKey(item);
      if (ts && key && !cachedTimestamps[key]) {
        cachedTimestamps[key] = ts;
      }
    });
    __gbAll = Array.isArray(items)
      ? items
          .map((item) => fillGuestbookTimestamp(item, cachedTimestamps))
          .filter((item) => String(item?.name || "").trim() && String(item?.msg || "").trim())
          .filter((item) => !isHeaderGuestbookEntry(item))
          .filter((item) => !isHiddenGuestbookEntry(item))
          .slice()
          .reverse()
      : [];
    __gbVisible = wasExpanded ? __gbAll.length : Math.min(GB_INITIAL_VISIBLE, __gbAll.length);
    paintGB();
  }

  function prependGB(item) {
    if (!item) return;
    const wasExpanded = __gbAll.length > GB_INITIAL_VISIBLE && __gbVisible >= __gbAll.length;
    rememberGuestbookTimestamp(item);
    __gbAll = [item, ...__gbAll];
    __gbVisible = wasExpanded ? __gbAll.length : Math.min(GB_INITIAL_VISIBLE, __gbAll.length);
    paintGB();
  }

  if (gbMoreBtn) {
    gbMoreBtn.addEventListener("click", () => {
      __gbVisible = __gbAll.length;
      paintGB();
    });
  }

  if (!hasGuestbookEndpoint()) {
    gbHint.textContent = "⚠️ 방명록 서버 URL이 설정되지 않았어요. config.js의 GUESTBOOK_ENDPOINT를 확인해주세요.";
    renderGB([]);
  } else {
    gbHint.textContent = "하객 모두가 같은 방명록을 공유합니다.";
    (async () => {
      try {
        const items = await gbFetchList();
        renderGB(items);
      } catch (e) {
        console.error(e);
        toast("방명록 불러오기 실패");
        gbHint.textContent = "⚠️ 방명록 서버 연결 실패: Apps Script 배포 권한(익명 접근) 확인 필요";
      }
    })();
  }

  gbForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (__gbSubmitting) return;
    const name = (gbName.value || "").trim();
    const msg = (gbMsg.value || "").trim();
    if (!name || !msg) return;

    if (!hasGuestbookEndpoint()) {
      toast("방명록 서버 URL이 아직 없어요 (config.js 확인)");
      return;
    }

    try {
      setGuestbookSubmitting(true);
      const result = await gbAddItem(name, msg);
      gbName.value = "";
      gbMsg.value = "";
      prependGB({
        ts: Number(result?.ts) || Date.now(),
        name,
        msg,
      });
      toast("방명록을 남겼어요!");
      Promise.resolve()
        .then(() => gbFetchList())
        .then((items) => renderGB(items))
        .catch((error) => console.error("Guestbook background refresh failed", error));
    } catch (err) {
      console.error(err);
      const m = String(err?.message || err);
      toast(
        m.includes("403") ? "방명록 저장 실패 (권한/배포 설정 403)" :
        m.includes("500") ? "방명록 저장 실패 (서버 오류 500)" :
        m.includes("invalid json") ? "방명록 저장 실패 (요청 형식/서버 응답 확인)" :
        m.includes("blocked keyword") ? "사용할 수 없는 단어가 포함되어 있습니다." :
        m.includes("Failed to fetch") ? "방명록 저장 실패 (CORS/배포 권한/URL 확인)" :
        "방명록 저장 실패"
      );
    } finally {
      setGuestbookSubmitting(false);
    }
  });

  if (weddingDdayEl) {
    const renderWeddingDday = () => {
      const content = getWeddingDdayContent(d.wedding.dateTimeISO);
      weddingDdayEl.innerHTML = content.html;
      weddingDdayEl.setAttribute("aria-label", content.text);
    };

    renderWeddingDday();
    window.setInterval(renderWeddingDday, 60000);
  }
}

build();
