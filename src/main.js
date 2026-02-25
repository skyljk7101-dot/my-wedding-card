import "./style.css";
import { INVITE } from "./config.js";

const $ = (sel) => document.querySelector(sel);
const encode = (s) => encodeURIComponent(String(s ?? ""));
const pad2 = (n) => String(n).padStart(2, "0");

// ✅ 네가 JS SDK 도메인 등록한 JavaScript 키 (950d...)
const KAKAO_JS_KEY = "950d726b2979c7f8113c72f6fbfb8771";

// ✅ 카카오 커스텀 템플릿 ID
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
  window.__toastTimer = setTimeout(() => (el.style.display = "none"), 1400);
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

function build() {
  const d = INVITE;
  const { groom, bride } = d.couple;
  const { lat, lng, venueName } = d.wedding;

  const brideSms = (bride.phone || "").replace(/[^0-9]/g, "");
  const groomSms = (groom.phone || "").replace(/[^0-9]/g, "");

  const NAVER_QUERY = "공덕 아펠가모";

  const inviteMessage = `“매일 네 하루에 조용히 구독했어.\n이제 평생, 내 마음으로만 자동연장되는 사랑💗”`;

  $("#app").innerHTML = `
  <main class="wrap">

    <header class="heroShowcase" id="heroShowcase">
      <div class="heroFinal">
        <img class="heroFinal__img" src="${d.heroImage}" alt="메인 사진">
        <div class="heroFinal__overlay">
          <div style="font-weight:700; font-size:18px;">DASOM · JAEGI</div>
          <div style="margin-top:6px; font-size:14px;">${d.wedding.dateText}</div>
        </div>
      </div>

      <div class="heroIntro" id="heroIntro">
        <div class="polStack">
          <div class="introPolaroid introPolaroid--1" id="p1">
            <img class="introPolaroid__img" src="${d.heroPolaroids[0]}" alt="polaroid1">
          </div>
          <div class="introPolaroid introPolaroid--2" id="p2">
            <img class="introPolaroid__img" src="${d.heroPolaroids[1]}" alt="polaroid2">
          </div>
          <div class="introPolaroid introPolaroid--3" id="p3">
            <img class="introPolaroid__img" src="${d.heroPolaroids[2]}" alt="polaroid3">
          </div>
        </div>

        <div class="scribbleWrapper">
          <div class="scribbleLeft">
            <span class="scribbleLine">Ad nuptias nostras</span><br>
            <span class="scribbleLine">te invitamus</span>
          </div>
        </div>
      </div>
    </header>

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
        <button id="addCal" class="btn btn--primary" type="button">캘린더에 추가</button>
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
      <h2 class="card__title">RSVP</h2>
      <p class="muted" style="margin:10px 0 12px; line-height:1.6;">구글폼으로 참석 여부를 남겨주세요.</p>
      <a class="btn btn--primary" target="_blank" rel="noopener" href="${d.rsvpUrl}">참석 여부 남기기</a>
    </section>

    <section class="card">
      <h2 class="card__title">청첩장 공유하기</h2>
      <p class="muted" style="margin:10px 0 12px; line-height:1.6;">카카오톡으로 예쁜 청첩장을 전해보세요.</p>
      <button id="kakaoShareBtn" class="btn" style="background-color:#FEE500; color:#000; border:none; font-weight:bold; width: 100%; border-radius: 14px;">
        카카오톡 공유하기
      </button>
    </section>

    <footer class="footer">${d.footerText}</footer>
  </main>

  <div id="modal" class="modal" aria-hidden="true">
    <div class="modal__backdrop"></div>
    <img id="modalImg" class="modal__img" alt="확대 이미지" />
  </div>
  `;

  // intro timing
  const intro = document.getElementById("heroIntro");
  const showcase = document.getElementById("heroShowcase");
  setTimeout(() => intro.classList.add("is-write"), 2000);
  setTimeout(() => document.getElementById("p1")?.classList.add("is-in"), 200);
  setTimeout(() => document.getElementById("p2")?.classList.add("is-in"), 3200);
  setTimeout(() => document.getElementById("p3")?.classList.add("is-in"), 6200);
  setTimeout(() => showcase.classList.add("is-done"), 9000);

  // naver maps
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

  // modal
  const modal = $("#modal");
  const modalImg = $("#modalImg");
  function openModal(src) {
    modalImg.src = src;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    modalImg.src = "";
  }
  modal.addEventListener("click", closeModal);

  // render galleries
  const weddingEl = $("#weddingGallery");
  d.weddingGallery.forEach((src, i) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = `wedding-${i + 1}`;
    img.loading = "lazy";
    img.addEventListener("click", () => openModal(src));
    weddingEl.appendChild(img);
  });

  const dailyEl = $("#dailyGallery");
  d.dailyGallery.forEach((src, i) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = `daily-${i + 1}`;
    img.loading = "lazy";
    img.addEventListener("click", () => openModal(src));
    dailyEl.appendChild(img);
  });

  // tabs
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

  // accounts
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

  // calendar (ics)
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

  // ✅ Kakao share
  const kakaoBtn = document.getElementById("kakaoShareBtn");
  if (kakaoBtn) {
    kakaoBtn.addEventListener("click", async () => {
      try {
        const ok = ensureKakaoInit();
        if (!ok) {
          toast("카카오 SDK 로딩 실패");
          return;
        }

        if (!window.Kakao.Share) {
          toast("Kakao.Share 사용 불가");
          return;
        }

        await window.Kakao.Share.sendCustom({
          templateId: KAKAO_TEMPLATE_ID,
        });
      } catch (e) {
        console.error(e);
        toast("카카오 공유 오류 (콘솔 확인)");
      }
    });
  }
}

build();