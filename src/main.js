import "./style.css";
import { INVITE } from "./config.js";

const $ = (sel) => document.querySelector(sel);
const encode = (s) => encodeURIComponent(String(s ?? ""));
const pad2 = (n) => String(n).padStart(2, "0");

// ✅ Kakao
const KAKAO_JS_KEY = "950d726b2979c7f8113c72f6fbfb8771";
const KAKAO_TEMPLATE_ID = 129829;

// ✅ Guestbook endpoint (Apps Script Web App URL)
const GUESTBOOK_ENDPOINT = INVITE.GUESTBOOK_ENDPOINT;

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

/* ===== scroll lock ===== */
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

/** ✅ 티맵: 절대 홈페이지로 이동 X (실패하면 토스트만) */
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

function formatTime(ts) {
  const d = new Date(ts);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}.${mm}.${dd} ${hh}:${mi}`;
}

/* ===== Guestbook ===== */
function hasGuestbookEndpoint() {
  return Boolean(
    GUESTBOOK_ENDPOINT &&
    String(GUESTBOOK_ENDPOINT).includes("script.google.com/macros/s/")
  );
}

async function gbFetchList() {
  const url = `${GUESTBOOK_ENDPOINT}?action=list&_=${Date.now()}`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(`Guestbook list failed: ${res.status}`);
  return await res.json();
}

async function gbAddItem(name, msg) {
  const body = new URLSearchParams();
  body.set("action", "add");
  body.set("name", name);
  body.set("msg", msg);

  const res = await fetch(GUESTBOOK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
  });
  if (!res.ok) throw new Error(`Guestbook add failed: ${res.status}`);
  const json = await res.json();
  if (!json?.ok) throw new Error(`Guestbook add failed: ${json?.error || "unknown"}`);
  return json;
}

function build() {
  const d = INVITE;

  $("#app").innerHTML = `
    <div class="intro" id="intro" aria-hidden="false">
      <div class="introStage">
        <div class="pol pol--1" id="p1">
          <img class="pol__img" src="${d.heroPolaroids[0]}" alt="intro-1" />
        </div>
        <div class="pol pol--2" id="p2">
          <img class="pol__img" src="${d.heroPolaroids[1]}" alt="intro-2" />
        </div>
        <div class="pol pol--3" id="p3">
          <img class="pol__img" src="${d.heroPolaroids[2]}" alt="intro-3" />
        </div>

        <div class="writePhrase" id="writePhrase" aria-label="we're getting married">
          <span class="w w1">we're</span>
          <span class="w w2">getting</span>
          <span class="w w3">married</span>
        </div>

        <!-- ✅ 기존 오류 원인이었던 #handwrite 실제로 넣음 -->
        <div class="handwrite" id="handwrite" aria-label="names handwriting">
          <span class="line">DASOM · JAEGI</span>
          <span class="line">2026.05.31</span>
        </div>

        <div class="introMeta">
          <div class="date">${d.wedding.dateText}</div>
          <div class="place">${d.wedding.venueName}<br/>${d.wedding.address}</div>
        </div>
      </div>
    </div>

    <div class="wrap" id="main" style="opacity:0;">
      <div class="heroCard">
        <img class="heroImg" src="${d.heroImage}" alt="hero"/>
        <div class="heroMeta">
          <div class="heroMeta__names">${d.couple.groom.name} · ${d.couple.bride.name}</div>
          <div class="heroMeta__info">
            <b>${d.wedding.dateText}</b><br/>
            ${d.wedding.venueName}<br/>
            <span class="muted">${d.wedding.address}</span>
          </div>
          <div class="grid2" style="margin-top:14px;">
            <button class="btn" id="kakaoShareBtn" type="button">카카오 공유</button>
            <button class="btn btn--primary" id="addCal" type="button">캘린더 추가</button>
          </div>
        </div>
      </div>

      <section class="card">
        <h2 class="card__title">초대합니다</h2>
        <p class="message">
소중한 분들을 모시고
두 사람이 사랑으로 하나 되는 날
기쁨의 자리에 함께해 주시면 감사하겠습니다.
        </p>
      </section>

      <section class="card">
        <h2 class="card__title">연락하기</h2>
        <div class="grid2" style="margin-top:12px;">
          <a class="btn" href="tel:${d.couple.groom.phone}">신랑 전화</a>
          <a class="btn" href="tel:${d.couple.bride.phone}">신부 전화</a>
        </div>
      </section>

      <section class="card">
        <h2 class="card__title">오시는 길</h2>
        <p class="muted" style="margin:10px 0 12px; line-height:1.6;">
          ${d.wedding.venueName}<br/>${d.wedding.address}
        </p>
        <div class="grid2">
          <button class="btn" id="naverMap" type="button">네이버지도</button>
          <button class="btn" id="tmapRoute" type="button">티맵 길찾기</button>
        </div>
      </section>

      <section class="card">
        <h2 class="card__title">갤러리</h2>
        <div class="tabs">
          <button class="tab is-active" id="tabWedding" type="button">웨딩</button>
          <button class="tab" id="tabDaily" type="button">일상</button>
        </div>

        <div style="margin-top:12px;">
          <div class="gallery gallery--wedding" id="weddingGallery"></div>
          <div class="gallery gallery--daily" id="dailyGallery" style="display:none;"></div>
        </div>
      </section>

      <section class="card">
        <h2 class="card__title">마음 전하실 곳</h2>
        <p class="muted" style="margin:10px 0 6px;">카드를 누르면 복사됩니다.</p>
        <div id="accounts"></div>
      </section>

      <section class="card">
        <h2 class="card__title">방명록</h2>
        <p class="muted" style="margin:10px 0 6px;">작성자와 내용을 남겨주세요.</p>

        <form id="gbForm" class="guestbookForm">
          <input id="gbName" class="input" maxlength="20" placeholder="작성자" required />
          <textarea id="gbMsg" class="textarea" maxlength="300" placeholder="내용" required></textarea>
          <button class="btn btn--primary" type="submit" style="width:100%;">남기기</button>
        </form>

        <div id="gbList" class="gbList"></div>
        <p class="muted" id="gbHint" style="margin-top:10px; font-size:12px; line-height:1.5;"></p>
      </section>

      <section class="card">
        <h2 class="card__title">RSVP</h2>
        <p class="muted" style="margin:10px 0 12px; line-height:1.6;">구글폼으로 참석 여부를 남겨주세요.</p>
        <a class="btn btn--primary" target="_blank" rel="noopener" href="${d.rsvpUrl}" style="width:100%; display:inline-flex; justify-content:center;">RSVP 작성하기</a>
      </section>

      <div class="footer">${d.footerText}</div>
    </div>

    <!-- modal -->
    <div class="modal" id="modal" aria-hidden="true">
      <div class="modal__backdrop"></div>
      <div class="modal__counter" id="modalCounter">1/1</div>
      <button class="modal__nav modal__nav--prev" id="modalPrev" type="button" aria-label="prev">‹</button>
      <button class="modal__nav modal__nav--next" id="modalNext" type="button" aria-label="next">›</button>
      <img class="modal__img" id="modalImg" alt="modal" />
    </div>
  `;

  /* ===== Intro animation (✅ null-safe) ===== */
  const intro = $("#intro");
  const main = $("#main");
  const p1 = $("#p1");
  const p2 = $("#p2");
  const p3 = $("#p3");
  const hand = $("#handwrite");
  const writePhrase = document.getElementById("writePhrase");

  if (p1) setTimeout(() => p1.classList.add("is-in"), 200);
  if (p2) setTimeout(() => p2.classList.add("is-in"), 700);
  if (p3) setTimeout(() => p3.classList.add("is-in"), 1200);

  // ✅ 문구를 “한 단어씩” 천천히 써지듯
  if (writePhrase) setTimeout(() => writePhrase.classList.add("is-write"), 1900);

  // ✅ 필기체(없으면 그냥 스킵)
  if (hand) setTimeout(() => hand.classList.add("is-write"), 3100);

  // 인트로 종료
  setTimeout(() => {
    if (intro) {
      intro.classList.add("is-hide");
      intro.setAttribute("aria-hidden", "true");
    }
    if (main) {
      main.style.transition = "opacity 450ms ease";
      main.style.opacity = "1";
    }
  }, 5600);

  /* ===== Map buttons ===== */
  const { lat, lng } = d.wedding;

  $("#naverMap").addEventListener("click", () => {
    const naverApp = `nmap://route/public?dlat=${lat}&dlng=${lng}&dname=${encode(d.wedding.venueName)}&appname=invite`;
    const naverWeb = `https://map.naver.com/v5/search/${encode(d.wedding.venueName)}?c=${lng},${lat},15,0,0,0,dh`;

    const start = Date.now();
    window.location.href = naverApp;
    setTimeout(() => {
      if (Date.now() - start < 1200) window.open(naverWeb, "_blank", "noopener");
    }, 700);
  });

  $("#tmapRoute").addEventListener("click", () => {
    openTmap({ name: d.wedding.venueName, lat, lng });
  });

  /* ===== Tabs ===== */
  const weddingEl = $("#weddingGallery");
  const dailyEl = $("#dailyGallery");
  const tabWedding = $("#tabWedding");
  const tabDaily = $("#tabDaily");

  function showWedding() {
    tabWedding.classList.add("is-active");
    tabDaily.classList.remove("is-active");
    weddingEl.style.display = "grid";
    dailyEl.style.display = "none";
  }
  function showDaily() {
    tabDaily.classList.add("is-active");
    tabWedding.classList.remove("is-active");
    weddingEl.style.display = "none";
    dailyEl.style.display = "grid";
  }
  tabWedding.addEventListener("click", showWedding);
  tabDaily.addEventListener("click", showDaily);

  /* ===== Modal slider + Counter + Scroll lock ===== */
  const modal = $("#modal");
  const modalImg = $("#modalImg");
  const modalPrev = $("#modalPrev");
  const modalNext = $("#modalNext");
  const modalCounter = $("#modalCounter");

  let currentList = [];
  let currentIndex = 0;

  function renderModal() {
    modalImg.src = currentList[currentIndex];
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
    document.addEventListener("touchmove", preventTouchMove, { passive: false });

    renderModal();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    modalImg.src = "";

    document.removeEventListener("touchmove", preventTouchMove);
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
  modalImg.addEventListener("click", (e) => e.stopPropagation());

  window.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("is-open")) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") prev();
    if (e.key === "ArrowRight") next();
  });

  // Swipe
  let touchStartX = 0;
  let touchStartY = 0;
  let touching = false;

  modalImg.addEventListener("touchstart", (e) => {
    if (!modal.classList.contains("is-open")) return;
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touching = true;
  }, { passive: true });

  modalImg.addEventListener("touchend", (e) => {
    if (!touching) return;
    touching = false;

    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;

    if (Math.abs(dx) < 40) return;
    if (Math.abs(dx) < Math.abs(dy)) return;

    if (dx > 0) prev();
    else next();
  }, { passive: true });

  // Render galleries
  d.weddingGallery.forEach((src, i) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = `wedding-${i + 1}`;
    img.loading = "lazy";
    img.addEventListener("click", () => openModal(d.weddingGallery, i));
    weddingEl.appendChild(img);
  });

  d.dailyGallery.forEach((src, i) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = `daily-${i + 1}`;
    img.loading = "lazy";
    img.addEventListener("click", () => openModal(d.dailyGallery, i));
    dailyEl.appendChild(img);
  });

  /* ===== Accounts ===== */
  const acc = $("#accounts");
  d.accounts.forEach((a) => {
    if (!a.number) return;
    const el = document.createElement("div");
    el.className = "account";
    el.innerHTML = `
      <div class="row" style="justify-content:space-between;">
        <span class="muted">${a.label}</span>
        <button class="btn btn--mini" type="button">계좌복사</button>
      </div>
      <b>${a.bank} ${a.number}</b>
      <div class="muted" style="margin-top:4px;">예금주: ${a.holder}</div>
    `;
    const txt = `${a.bank} ${a.number} (${a.holder})`;
    el.addEventListener("click", () => copyText(txt));
    acc.appendChild(el);
  });

  /* ===== Calendar (ics) ===== */
  $("#addCal").addEventListener("click", () => {
    const start = new Date(d.wedding.dateTimeISO);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const toICS = (date) =>
      date.getUTCFullYear() +
      pad2(date.getUTCMonth() + 1) +
      pad2(date.getUTCDate()) +
      "T" +
      pad2(date.getUTCHours()) +
      pad2(date.getUTCMinutes()) +
      "00Z";

    const ics =
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Wedding Invite//KO//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:wedding-${start.getTime()}@invite
DTSTAMP:${toICS(new Date())}
DTSTART:${toICS(start)}
DTEND:${toICS(end)}
SUMMARY:DASOM · JAEGI 결혼식
LOCATION:${d.wedding.venueName} ${d.wedding.address}
DESCRIPTION:모바일 청첩장
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wedding.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("캘린더 파일을 다운로드했어요!");
  });

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

  /* ===== Guestbook (shared) ===== */
  const gbListEl = $("#gbList");
  const gbHint = $("#gbHint");
  const gbForm = $("#gbForm");
  const gbName = $("#gbName");
  const gbMsg = $("#gbMsg");

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderGB(items) {
    gbListEl.innerHTML = "";
    if (!items || !items.length) {
      gbListEl.innerHTML = `<div class="muted" style="padding:10px 2px;">아직 방명록이 없어요 🙂</div>`;
      return;
    }
    items.slice().reverse().forEach((it) => {
      const div = document.createElement("div");
      div.className = "gbItem";
      div.innerHTML = `
        <div class="gbMeta">
          <div class="gbName">${escapeHtml(it.name)}</div>
          <div class="gbTime">${formatTime(it.ts)}</div>
        </div>
        <div class="gbMsg">${escapeHtml(it.msg)}</div>
      `;
      gbListEl.appendChild(div);
    });
  }

  if (!hasGuestbookEndpoint()) {
    gbHint.textContent = "⚠️ 방명록 서버(구글 Apps Script) URL이 설정되지 않았어요. config.js의 GUESTBOOK_ENDPOINT를 배포 URL로 바꿔주세요.";
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
    const name = (gbName.value || "").trim();
    const msg = (gbMsg.value || "").trim();
    if (!name || !msg) return;

    if (!hasGuestbookEndpoint()) {
      toast("방명록 서버 URL이 아직 없어요 (config.js 확인)");
      return;
    }

    try {
      await gbAddItem(name, msg);
      gbName.value = "";
      gbMsg.value = "";
      toast("방명록을 남겼어요!");
      const items = await gbFetchList();
      renderGB(items);
    } catch (err) {
      console.error(err);
      const m = String(err?.message || err);
      toast(
        m.includes("403") ? "방명록 저장 실패 (권한/배포 설정 403)" :
        m.includes("500") ? "방명록 저장 실패 (서버 오류 500)" :
        m.includes("Failed to fetch") ? "방명록 저장 실패 (CORS/배포 권한/URL 확인)" :
        "방명록 저장 실패"
      );
    }
  });
}

build();