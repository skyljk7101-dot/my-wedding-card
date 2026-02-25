import "./style.css";
import { INVITE } from "./config.js";

const $ = (sel) => document.querySelector(sel);
const encode = (s) => encodeURIComponent(String(s ?? ""));
const pad2 = (n) => String(n).padStart(2, "0");

// ✅ 네가 JS SDK 도메인 등록한 JavaScript 키
const KAKAO_JS_KEY = "950d726b2979c7f8113c72f6fbfb8771";
const KAKAO_TEMPLATE_ID = 129829;

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
  window.__toastTimer = setTimeout(() => (el.style.display = "none"), 1600);
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

/** ✅ 티맵: iOS에서 잘 쓰는 rGoName/rGoX/rGoY 1순위, 실패 시 goalname/goalx/goaly 시도
 *  - 절대 티맵 홈페이지로 이동시키지 않음(튕김 방지)
 */
function openTmap({ name, lat, lng }) {
  const nameEnc = encode(name);

  // iOS에서 많이 쓰는 파라미터
  const url1 = `tmap://route?rGoName=${nameEnc}&rGoX=${lng}&rGoY=${lat}`;
  // 안드/일부 환경
  const url2 = `tmap://route?goalname=${nameEnc}&goalx=${lng}&goaly=${lat}`;

  const tryOpen = (url) =>
    new Promise((resolve) => {
      const start = Date.now();
      window.location.href = url;
      setTimeout(() => resolve(Date.now() - start), 650);
    });

  (async () => {
    const t1 = await tryOpen(url1);
    // 앱이 실제로 열리면 브라우저가 백그라운드로 가서 여기 로직이 의미 없어지는 경우가 많음.
    // "너무 빨리" 돌아오면 실패로 간주하고 2번째 스킴 시도
    if (t1 < 1100) {
      const t2 = await tryOpen(url2);
      if (t2 < 1100) {
        toast("티맵 앱이 설치되어 있지 않거나, 호출이 차단됐어요.");
      }
    }
  })();
}

/* ===== 모달 열릴 때 뒤 스크롤 완전 잠금 ===== */
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

// iOS에서 모달 오픈 중 touchmove로 바디가 움직이는 것 방지
function preventTouchMove(e) {
  e.preventDefault();
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

function build() {
  const d = INVITE;
  const { groom, bride } = d.couple;
  const { lat, lng, venueName } = d.wedding;

  const brideSms = (bride.phone || "").replace(/[^0-9]/g, "");
  const groomSms = (groom.phone || "").replace(/[^0-9]/g, "");

  const NAVER_QUERY = "공덕 아펠가모";
  const inviteMessage = `“매일 네 하루에 조용히 구독했어.\n이제 평생, 내 마음으로만 자동연장되는 사랑💗”`;

  $("#app").innerHTML = `
  <!-- Intro -->
  <section id="intro" class="intro" aria-hidden="false">
    <div class="introStage">
      <div class="pol pol--1" id="p1">
        <img class="pol__img" src="${d.heroPolaroids[0]}" alt="intro-1" />
        <div class="pol__cap">${bride.name}</div>
      </div>
      <div class="pol pol--2" id="p2">
        <img class="pol__img" src="${d.heroPolaroids[1]}" alt="intro-2" />
        <div class="pol__cap">${groom.name}</div>
      </div>
      <div class="pol pol--3" id="p3">
        <img class="pol__img" src="${d.heroPolaroids[2]}" alt="intro-3" />
        <div class="pol__cap">${d.wedding.dateText}</div>
      </div>

      <div class="burst" id="burst">we getting married!!!</div>

      <div class="handwrite" id="handwrite">
        <span class="line">${groom.name}</span><br/>
        <span class="line">&amp; ${bride.name}</span>
      </div>

      <div class="introMeta">
        <div class="date">${d.wedding.dateText}</div>
        <div class="place">${d.wedding.venueName}<br/>${d.wedding.address}</div>
      </div>
    </div>
  </section>

  <!-- Main -->
  <main class="wrap" id="main" style="opacity:0;">
    <section class="heroCard">
      <img class="heroImg" src="${d.heroImage}" alt="메인 사진" />
      <div class="heroMeta">
        <div class="heroMeta__names">DASOM · JAEGI</div>
        <div class="heroMeta__info">
          <div><b>${d.wedding.dateText}</b></div>
          <div style="margin-top:6px;">${d.wedding.venueName}</div>
          <div class="muted" style="margin-top:6px;">${d.wedding.address}</div>
        </div>
      </div>
    </section>

    <section class="card">
      <h2 class="card__title">초대합니다</h2>
      <p class="message">${inviteMessage}</p>

      <div style="margin-top:16px; display:flex; flex-direction:column; gap:10px;">
        <div class="row">
          <span class="muted" style="width:42px;">신부</span>
          <span style="flex:1;">정대연 · 장영화의 장녀 <b>${bride.name}</b></span>
          <a class="btn btn--mini" href="sms:${brideSms}">문자</a>
        </div>

        <div class="row">
          <span class="muted" style="width:42px;">신랑</span>
          <span style="flex:1;">유순덕의 장남 <b>${groom.name}</b></span>
          <a class="btn btn--mini" href="sms:${groomSms}">문자</a>
        </div>
      </div>
    </section>

    <section class="card">
      <h2 class="card__title">예식 안내</h2>

      <div style="display:flex; flex-direction:column; gap:12px; margin-top:10px;">
        <div class="row">
          <div class="muted" style="width:54px;">일시</div>
          <div><b>${d.wedding.dateText}</b></div>
        </div>

        <div class="row">
          <div class="muted" style="width:54px;">장소</div>
          <div>
            <div><b>${d.wedding.venueName}</b></div>
            <div class="muted" style="margin-top:4px; line-height:1.5;">${d.wedding.address}</div>
          </div>
        </div>
      </div>

      <div style="margin-top:14px;">
        <button id="addCal" class="btn btn--primary" type="button" style="width:100%;">캘린더에 추가</button>
      </div>

      <p class="hr-dashed" style="font-size:12px; color:#777; line-height:1.6;">
        예식장 규정에 따라 화환 반입이 불가하여 마음만 감사히 받겠습니다.<br>
        (리본띠만 받습니다.)
      </p>
    </section>

    <section class="card">
      <h2 class="card__title">오시는 길</h2>
      <p class="muted" style="margin:10px 0 12px; line-height:1.6;">버튼을 누르면 지도 앱/웹으로 이동합니다.</p>

      <div class="grid2">
        <a class="btn" target="_blank" rel="noopener"
           href="https://map.kakao.com/link/map/${encode(venueName)},${lat},${lng}">카카오맵(위치)</a>
        <a class="btn" target="_blank" rel="noopener"
           href="https://map.kakao.com/link/to/${encode(venueName)},${lat},${lng}">카카오맵(길찾기)</a>

        <a class="btn" id="naverMap" href="#" rel="noopener">네이버지도(위치)</a>
        <a class="btn" id="naverRoute" href="#" rel="noopener">네이버지도(길찾기)</a>
      </div>

      <div style="margin-top:10px;">
        <button class="btn" id="tmapRoute" type="button" style="width:100%;">티맵(길찾기)</button>
      </div>
    </section>

    <section class="card">
      <h2 class="card__title">Gallery</h2>

      <div class="tabs">
        <button class="tab is-active" id="tabWedding" type="button">Wedding</button>
        <button class="tab" id="tabDaily" type="button">Daily</button>
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
      <p class="muted" style="margin-top:10px; font-size:12px; line-height:1.5;">
        ※ 현재는 ‘내 기기’에만 저장되는 간단 방명록이에요. (원하면 하객 모두가 공유하는 방명록으로 바꿔드릴게요)
      </p>
    </section>

    <section class="card">
      <h2 class="card__title">RSVP</h2>
      <p class="muted" style="margin:10px 0 12px; line-height:1.6;">구글폼으로 참석 여부를 남겨주세요.</p>
      <a class="btn btn--primary" target="_blank" rel="noopener" href="${d.rsvpUrl}" style="width:100%;">참석 여부 남기기</a>
    </section>

    <section class="card">
      <h2 class="card__title">청첩장 공유하기</h2>
      <p class="muted" style="margin:10px 0 12px; line-height:1.6;">카카오톡으로 예쁜 청첩장을 전해보세요.</p>
      <button id="kakaoShareBtn" class="btn" style="background-color:#FEE500; color:#000; border:none; font-weight:bold; width: 100%; border-radius: 14px;">
        카카오톡 공유하기
      </button>
    </section>

    <footer class="footer">${d.footerText}</footer>

    <!-- Modal (gallery slider) -->
    <div id="modal" class="modal" aria-hidden="true">
      <div class="modal__backdrop"></div>
      <button id="modalPrev" class="modal__nav modal__nav--prev" type="button" aria-label="이전 사진">‹</button>
      <img id="modalImg" class="modal__img" alt="확대 이미지" />
      <button id="modalNext" class="modal__nav modal__nav--next" type="button" aria-label="다음 사진">›</button>
    </div>
  </main>
  `;

  // ===== Intro timing =====
  const intro = $("#intro");
  const main = $("#main");
  const p1 = $("#p1");
  const p2 = $("#p2");
  const p3 = $("#p3");
  const burst = $("#burst");
  const hand = $("#handwrite");

  setTimeout(() => p1.classList.add("is-in"), 200);
  setTimeout(() => p2.classList.add("is-in"), 700);
  setTimeout(() => p3.classList.add("is-in"), 1200);

  // “we getting married!!!” 0.5초 간격으로 3번 튀기기(다다닥 느낌)
  setTimeout(() => burst.classList.add("is-on"), 1600);
  setTimeout(() => { burst.classList.remove("is-on"); }, 1850);
  setTimeout(() => burst.classList.add("is-on"), 2100);
  setTimeout(() => { burst.classList.remove("is-on"); }, 2350);
  setTimeout(() => burst.classList.add("is-on"), 2600);

  setTimeout(() => hand.classList.add("is-write"), 3100);

  setTimeout(() => {
    intro.classList.add("is-hide");
    intro.setAttribute("aria-hidden", "true");
    main.style.transition = "opacity 450ms ease";
    main.style.opacity = "1";
  }, 4600);

  // ===== Naver maps =====
  const naverPlaceApp = `nmap://place?lat=${lat}&lng=${lng}&name=${encode(NAVER_QUERY)}&appname=com.example.weddinginvite`;
  const naverRouteApp = `nmap://route/car?dlat=${lat}&dlng=${lng}&dname=${encode(NAVER_QUERY)}&appname=com.example.weddinginvite`;
  const naverWeb = `https://map.naver.com/v5/search/${encode(NAVER_QUERY)}`;

  $("#naverMap").addEventListener("click", (e) => {
    e.preventDefault();
    const start = Date.now();
    window.location.href = naverPlaceApp;
    setTimeout(() => {
      if (Date.now() - start < 1200) window.open(naverWeb, "_blank", "noopener");
    }, 700);
  });

  $("#naverRoute").addEventListener("click", (e) => {
    e.preventDefault();
    const start = Date.now();
    window.location.href = naverRouteApp;
    setTimeout(() => {
      if (Date.now() - start < 1200) window.open(naverWeb, "_blank", "noopener");
    }, 700);
  });

  // ===== Tmap =====
  $("#tmapRoute").addEventListener("click", () => {
    openTmap({ name: NAVER_QUERY, lat, lng });
  });

  // ===== Tabs =====
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

  // ===== Modal slider (스크롤 잠금 포함) =====
  const modal = $("#modal");
  const modalImg = $("#modalImg");
  const modalPrev = $("#modalPrev");
  const modalNext = $("#modalNext");

  let currentList = [];
  let currentIndex = 0;

  function renderModal() {
    modalImg.src = currentList[currentIndex];

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

    // ✅ 뒤 스크롤 완전 잠금
    lockScroll();
    document.addEventListener("touchmove", preventTouchMove, { passive: false });

    renderModal();
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    modalImg.src = "";

    // ✅ 잠금 해제
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

  // Swipe (사진만 이동)
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

  // Accounts
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

  // Calendar (ics)
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

  // Kakao share
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

  // ===== 방명록 (로컬 저장) =====
  const KEY = "wedding_guestbook_v1";
  const gbListEl = $("#gbList");
  const gbForm = $("#gbForm");
  const gbName = $("#gbName");
  const gbMsg = $("#gbMsg");

  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "[]");
    } catch {
      return [];
    }
  };
  const save = (items) => localStorage.setItem(KEY, JSON.stringify(items));

  function renderGB() {
    const items = load();
    gbListEl.innerHTML = "";
    if (!items.length) {
      gbListEl.innerHTML = `<div class="muted" style="padding:10px 2px;">아직 방명록이 없어요 🙂</div>`;
      return;
    }
    items.slice().reverse().forEach((it) => {
      const div = document.createElement("div");
      div.className = "gbItem";
      div.innerHTML = `
        <div class="gbMeta">
          <div class="gbName">${it.name}</div>
          <div class="gbTime">${formatTime(it.ts)}</div>
        </div>
        <div class="gbMsg">${it.msg}</div>
      `;
      gbListEl.appendChild(div);
    });
  }

  renderGB();

  gbForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = (gbName.value || "").trim();
    const msg = (gbMsg.value || "").trim();
    if (!name || !msg) return;

    const items = load();
    items.push({ name, msg, ts: Date.now() });
    save(items);

    gbName.value = "";
    gbMsg.value = "";
    toast("방명록을 남겼어요!");
    renderGB();
  });
}

build();