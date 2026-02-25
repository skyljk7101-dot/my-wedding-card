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

function formatTime(ts) {
  const d = new Date(ts);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}.${mm}.${dd} ${hh}:${mi}`;
}

/* ===== Guestbook (shared) ===== */
function hasGuestbookEndpoint() {
  return typeof GUESTBOOK_ENDPOINT === "string" && GUESTBOOK_ENDPOINT.startsWith("http");
}

async function safeRead(res) {
  const txt = await res.text().catch(() => "");
  // json일 수도, 아닐 수도 있어서 안전하게 처리
  try { return { text: txt, json: txt ? JSON.parse(txt) : null }; }
  catch { return { text: txt, json: null }; }
}

async function gbFetchList() {
  if (!hasGuestbookEndpoint()) return [];
  const res = await fetch(`${GUESTBOOK_ENDPOINT}?action=list`, {
    method: "GET",
    mode: "cors",
    cache: "no-store",
  });
  if (!res.ok) {
    const payload = await safeRead(res);
    throw new Error(`list failed (${res.status}) ${payload.text}`.trim());
  }
  const payload = await safeRead(res);
  return payload.json || [];
}

async function gbAddItem(name, msg) {
  if (!hasGuestbookEndpoint()) throw new Error("no endpoint");

  const body = new URLSearchParams({
    action: "add",
    name,
    msg,
  });

  const res = await fetch(GUESTBOOK_ENDPOINT, {
    method: "POST",
    // ✅ 프리플라이트 유발 안 하는 Content-Type
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`add failed (${res.status}) ${txt}`.trim());
  }

  // Apps Script가 JSON을 주면 파싱, 아니면 통과
  const txt = await res.text().catch(() => "");
  try { return txt ? JSON.parse(txt) : {}; } catch { return {}; }
}

function build() {
  const d = INVITE;
  const { groom, bride } = d.couple;
  const { lat, lng, venueName } = d.wedding;

  const brideSms = (bride.phone || "").replace(/[^0-9]/g, "");
  const groomSms = (groom.phone || "").replace(/[^0-9]/g, "");

  const inviteMessage = `“매일 네 하루에 조용히 구독했어.\n이제 평생, 내 마음으로만 자동연장되는 사랑💗”`;

  $("#app").innerHTML = `
  <!-- Intro -->
  <section id="intro" class="intro" aria-hidden="false">
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
      <p class="muted" id="gbHint" style="margin-top:10px; font-size:12px; line-height:1.5;"></p>
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
      <div id="modalCounter" class="modal__counter">1/1</div>
      <button id="modalPrev" class="modal__nav modal__nav--prev" type="button" aria-label="이전 사진">‹</button>
      <img id="modalImg" class="modal__img" alt="확대 이미지" />
      <button id="modalNext" class="modal__nav modal__nav--next" type="button" aria-label="다음 사진">›</button>
    </div>
  </main>
  `;

  /* ===== INTRO timing ===== */
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

  // we getting married!!! 다다닥 느낌 (3번 점멸)
const writePhrase = document.getElementById("writePhrase");

setTimeout(() => p1.classList.add("is-in"), 200);
setTimeout(() => p2.classList.add("is-in"), 700);
setTimeout(() => p3.classList.add("is-in"), 1200);

// ✅ 문구를 “한 단어씩” 천천히 써지듯
setTimeout(() => writePhrase.classList.add("is-write"), 1900);

// 인트로 종료 타이밍 조금 늦춤 (문구 애니메이션 보이게)
setTimeout(() => {
  intro.classList.add("is-hide");
  intro.setAttribute("aria-hidden", "true");
  main.style.transition = "opacity 450ms ease";
  main.style.opacity = "1";
}, 5600);

  setTimeout(() => hand.classList.add("is-write"), 3100);

  setTimeout(() => {
    intro.classList.add("is-hide");
    intro.setAttribute("aria-hidden", "true");
    main.style.transition = "opacity 450ms ease";
    main.style.opacity = "1";
  }, 4600);

  /* ===== Naver maps ===== */
  const naverPlaceApp = `nmap://place?lat=${lat}&lng=${lng}&name=${encode("공덕 아펠가모")}&appname=com.example.weddinginvite`;
  const naverRouteApp = `nmap://route/car?dlat=${lat}&dlng=${lng}&dname=${encode("공덕 아펠가모")}&appname=com.example.weddinginvite`;
  const naverWeb = `https://map.naver.com/v5/search/${encode("공덕 아펠가모")}`;

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

  /* ===== Tmap ===== */
  $("#tmapRoute").addEventListener("click", () => {
    openTmap({ name: "공덕 아펠가모", lat, lng });
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
          <div class="gbName">${it.name}</div>
          <div class="gbTime">${formatTime(it.ts)}</div>
        </div>
        <div class="gbMsg">${it.msg}</div>
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
      // ✅ 실패 원인을 사용자에게 더 명확히 보여줌
      const msg = String(err?.message || err);
      toast(msg.includes("403") ? "방명록 저장 실패 (권한/배포 설정 403)" :
           msg.includes("500") ? "방명록 저장 실패 (서버 오류 500)" :
           msg.includes("Failed to fetch") ? "방명록 저장 실패 (CORS/배포 권한/URL 확인)" :
           "방명록 저장 실패");
    }
  });
}

const SHEET_NAME = "guestbook";

function ensureSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(["ts", "name", "msg"]);
  }
  return sh;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "";
  if (action !== "list") return json_({ ok:false, error:"invalid action" });

  const sh = ensureSheet_();
  const values = sh.getDataRange().getValues();
  const rows = values.slice(1).map(r => ({
    ts: Number(r[0]) || Date.now(),
    name: String(r[1] || ""),
    msg: String(r[2] || ""),
  }));
  return json_(rows);
}

function doPost(e) {
  // ✅ 1) form-urlencoded로 들어온 값 우선 사용
  const p = (e && e.parameter) ? e.parameter : {};
  let action = p.action || "";
  let name = p.name || "";
  let msg  = p.msg  || "";

  // ✅ 2) JSON으로 들어온 경우도 대비
  if (!action && e && e.postData && e.postData.contents) {
    try {
      const body = JSON.parse(e.postData.contents);
      action = body.action || action;
      name = body.name || name;
      msg = body.msg || msg;
    } catch (_) {}
  }

  if (action !== "add") return json_({ ok:false, error:"invalid action" });

  name = String(name || "").trim();
  msg  = String(msg  || "").trim();
  if (!name || !msg) return json_({ ok:false, error:"name/msg required" });

  const sh = ensureSheet_();
  const ts = Date.now();
  sh.appendRow([ts, name, msg]);

  return json_({ ok:true, ts });
}

build();