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
  return typeof GUESTBOOK_ENDPOINT === "string" && GUESTBOOK_ENDPOINT.includes("script.google.com/macros/s/");
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

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function build() {
  const d = INVITE;

  const inviteMessage = `"매일 네 하루에 조용히 구독했어.\n이제 평생, 내 마음으로만 자동연장되는 사랑💗"`;

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
      <div class="pol pol--1" id="p1"><img class="pol__img" src="${d.heroPolaroids[0]}" alt="intro-1"></div>
      <div class="pol pol--2" id="p2"><img class="pol__img" src="${d.heroPolaroids[1]}" alt="intro-2"></div>
      <div class="pol pol--3" id="p3"><img class="pol__img" src="${d.heroPolaroids[2]}" alt="intro-3"></div>

      <div class="writePhrase" id="writePhrase" aria-label="Locked In For Life">
        Locked In For Life
      </div>
  </div>

  <main class="wrap" id="main" style="opacity:0;">
    <div class="heroCard">
      <img class="heroImg" src="${d.heroImage}" alt="hero"/>
      <div class="heroMeta">
        <div class="heroMeta__names">${groom.name} · ${bride.name}</div>
        <div class="heroMeta__info">
          <b>${d.wedding.dateText}</b><br/>
          ${d.wedding.venueName}
          <div class="muted" style="margin-top:6px;">${d.wedding.address}</div>
        </div>
      </div>
    </div>

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
          <div><b>${d.wedding.venueName}</b><div class="muted" style="margin-top:4px;">${d.wedding.address}</div></div>
        </div>
      </div>
    </section>

    <section class="card">
      <h2 class="card__title">오시는 길</h2>

      <div class="grid2" style="margin-top:12px;">
        <a class="btn" href="${naverSearchUrl}" target="_blank" rel="noopener">네이버지도 위치</a>
        <button class="btn" id="naverRouteBtn" type="button">네이버지도 길찾기</button>
      </div>

      <div class="grid2" style="margin-top:10px;">
        <a class="btn" href="${kakaoPlaceUrl}" target="_blank" rel="noopener">카카오맵 위치</a>
        <a class="btn" href="${kakaoRouteUrl}" target="_blank" rel="noopener">카카오맵 길찾기</a>
      </div>

      <div style="margin-top:10px;">
        <button class="btn" id="tmapBtn" type="button" style="width:100%;">티맵 길찾기</button>
      </div>
    </section>

    <section class="card">
      <h2 class="card__title">갤러리</h2>
      <div style="margin-top:12px;">
        <div class="gallery gallery--wedding" id="weddingGallery"></div>
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
      <button id="gbMore" class="btn" type="button" style="width:100%; margin-top:10px; display:none;">더보기</button>
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
      <button id="kakaoShareBtn" class="btn" style="background-color:#FEE500; color:#000; border:none; font-weight:bold; width:100%; border-radius:14px;">
        카카오톡 공유하기
      </button>
    </section>

    <footer class="footer">${d.footerText}</footer>

    <div id="modal" class="modal" aria-hidden="true">
      <div class="modal__backdrop"></div>
      <div class="modal__counter" id="modalCounter">1/1</div>
      <button class="modal__nav modal__nav--prev" id="modalPrev" type="button" aria-label="이전 사진">‹</button>
      <img class="modal__img" id="modalImg" alt="modal" />
      <button class="modal__nav modal__nav--next" id="modalNext" type="button" aria-label="다음 사진">›</button>
    </div>
  </main>
  `;

  /* ===== INTRO timing ===== */
  const intro = $("#intro");
  const main = $("#main");
  const p1 = $("#p1");
  const p2 = $("#p2");
  const p3 = $("#p3");
  const writePhrase = document.getElementById("writePhrase");
  const hand = $("#handwrite");

  if (p1) setTimeout(() => p1.classList.add("is-in"), 200);
  if (p2) setTimeout(() => p2.classList.add("is-in"), 700);
  if (p3) setTimeout(() => p3.classList.add("is-in"), 1200);

  if (writePhrase) setTimeout(() => writePhrase.classList.add("is-write"), 1900);
  if (hand) setTimeout(() => hand.classList.add("is-write"), 3100);

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

  /* ===== Gallery (웨딩만) ===== */
  const weddingEl = $("#weddingGallery");

  /* ===== Modal slider ===== */
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
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (ax < SWIPE_THRESHOLD_PX) return;
    if (ax < ay * 1.2) return;
    if (dx < 0) fireSwipeOnce(next);
    else fireSwipeOnce(prev);
  }

  let tStartX = 0;
  let tStartY = 0;
  modalImg.addEventListener(
    "touchstart",
    (e) => {
      if (!modal.classList.contains("is-open")) return;
      const t = e.touches?.[0];
      if (!t) return;
      tStartX = t.clientX;
      tStartY = t.clientY;
    },
    { passive: true }
  );
  modalImg.addEventListener(
    "touchend",
    (e) => {
      if (!modal.classList.contains("is-open")) return;
      const t = e.changedTouches?.[0];
      if (!t) return;
      handleSwipe(t.clientX - tStartX, t.clientY - tStartY);
    },
    { passive: true }
  );

  let pDown = false;
  let pId = null;
  let pStartX = 0;
  let pStartY = 0;
  let pDx = 0;
  let pDy = 0;

  modalImg.addEventListener("pointerdown", (e) => {
    if (!modal.classList.contains("is-open")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pDown = true;
    pId = e.pointerId;
    pStartX = e.clientX;
    pStartY = e.clientY;
    pDx = 0;
    pDy = 0;
    try { modalImg.setPointerCapture?.(e.pointerId); } catch {}
  });
  modalImg.addEventListener("pointermove", (e) => {
    if (!pDown) return;
    if (pId !== null && e.pointerId !== pId) return;
    pDx = e.clientX - pStartX;
    pDy = e.clientY - pStartY;
  });
  const endPointer = (e) => {
    if (!pDown) return;
    if (pId !== null && e.pointerId !== pId) return;
    pDown = false;
    pId = null;
    handleSwipe(pDx, pDy);
    pDx = 0;
    pDy = 0;
  };
  modalImg.addEventListener("pointerup", endPointer);
  modalImg.addEventListener("pointercancel", endPointer);

  // ✅ 갤러리 렌더링: decoding="async" 추가로 메인 스레드 블로킹 방지
  d.weddingGallery.forEach((src, i) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = `wedding-${i + 1}`;
    img.loading = "lazy";
    img.decoding = "async"; // ✅ 추가: 비동기 디코딩으로 렌더링 성능 개선
    img.addEventListener("click", () => openModal(d.weddingGallery, i));
    weddingEl.appendChild(img);
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

  const GB_PAGE_SIZE = 5;
  let __gbAll = [];
  let __gbVisible = GB_PAGE_SIZE;

  function updateGbMoreBtn() {
    if (!gbMoreBtn) return;
    const remaining = Math.max(0, __gbAll.length - __gbVisible);
    if (remaining <= 0) {
      gbMoreBtn.style.display = "none";
      return;
    }
    gbMoreBtn.style.display = "inline-flex";
    gbMoreBtn.textContent = `더보기 (+${Math.min(GB_PAGE_SIZE, remaining)}개)`;
  }

  function paintGB() {
    gbListEl.innerHTML = "";

    if (!__gbAll.length) {
      gbListEl.innerHTML = `<div class="muted" style="padding:10px 2px;">아직 방명록이 없어요 🙂</div>`;
      if (gbMoreBtn) gbMoreBtn.style.display = "none";
      return;
    }

    __gbAll.slice(0, __gbVisible).forEach((it) => {
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

    updateGbMoreBtn();
  }

  function renderGB(items) {
    __gbAll = Array.isArray(items) ? items.slice().reverse() : [];
    __gbVisible = GB_PAGE_SIZE;
    paintGB();
  }

  if (gbMoreBtn) {
    gbMoreBtn.addEventListener("click", () => {
      __gbVisible = Math.min(__gbVisible + GB_PAGE_SIZE, __gbAll.length);
      paintGB();
    });
  }

  if (!hasGuestbookEndpoint()) {
    gbHint.textContent = "⚠️ 방명록 서버 URL이 설정되지 않았어요. config.js의 GUESTBOOK_ENDPOINT를 배포 URL로 바꿔주세요.";
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
