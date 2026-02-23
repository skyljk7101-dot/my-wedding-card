import "./style.css";
import { INVITE } from "./config.js";

const $ = (sel) => document.querySelector(sel);
const encode = (s) => encodeURIComponent(String(s ?? ""));
const pad2 = (n) => String(n).padStart(2, "0");

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

function build() {
  const d = INVITE;
  const { groom, bride } = d.couple;
  const { lat, lng, venueName } = d.wedding;

  $("#app").innerHTML = `
  <main class="wrap">

    <!-- HERO -->
    <header class="heroShowcase" id="heroShowcase">

      <!-- 최종 메인(글씨 그대로 유지) -->
      <div class="heroFinal">
        <img class="heroFinal__img" src="${d.heroImage}" alt="메인 사진">
        <div class="heroFinal__overlay">
          <div style="font-weight:700; font-size:18px;">
            ${bride.name} · ${groom.name}
          </div>
          <div style="margin-top:6px; font-size:14px;">
            ${d.wedding.dateText}
          </div>
        </div>
      </div>

      <!-- 인트로(라틴어 그대로) -->
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

    <!-- 초대합니다 -->
    <section class="card">
      <h2 class="card__title">초대합니다</h2>

      <p class="message" style="margin-top:6px;">
서로의 하루가 되기로 했습니다.
이제는 평생으로.
      </p>

      <!-- 고급스럽게: 부모님표기/이름 정렬 + 신부이름 볼드 -->
      <div style="margin-top:16px; display:flex; flex-direction:column; gap:12px;">
        <div class="row" style="align-items:flex-start;">
          <span class="muted" style="width:42px; padding-top:2px;">신부</span>
          <div style="flex:1; line-height:1.65;">
            <span style="color:#666;">정대연 · 장영화의 장녀</span>
            <b style="margin-left:6px;">${bride.name}</b>
          </div>
        </div>

        <div class="row" style="align-items:flex-start;">
          <span class="muted" style="width:42px; padding-top:2px;">신랑</span>
          <div style="flex:1; line-height:1.65;">
            <span style="color:#666;">유순덕의 장남</span>
            <b style="margin-left:6px;">${groom.name}</b>
          </div>
        </div>
      </div>
    </section>

    <!-- 예식 안내 -->
    <section class="card">
      <h2 class="card__title">예식 안내</h2>

      <div style="display:flex; flex-direction:column; gap:12px;">
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

      <!-- ✅ 캘린더에 추가(ICS) 복구 -->
      <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap;">
        <button id="addCal" class="btn btn--primary" style="flex:1;">캘린더에 추가</button>
      </div>

      <p style="
        margin-top:18px;
        padding-top:14px;
        border-top:1px dashed rgba(0,0,0,0.12);
        font-size:12px;
        color:#777;
        line-height:1.6;
      ">
        예식장 규정에 따라 화환 반입이 불가하여 마음만 감사히 받겠습니다.<br>
        (리본띠만 받습니다.)
      </p>
    </section>

    <!-- 오시는 길 -->
    <section class="card">
      <h2 class="card__title">오시는 길</h2>
      <p class="muted" style="margin:0 0 12px; line-height:1.6;">
        버튼을 누르면 지도 앱/웹으로 이동합니다.
      </p>

      <!-- ✅ 카카오/네이버: 위치 + 길찾기 4버튼 -->
      <div class="grid2">
        <a class="btn" target="_blank" rel="noopener"
           href="https://map.kakao.com/link/map/${encode(venueName)},${lat},${lng}">
          카카오맵(위치)
        </a>
        <a class="btn" target="_blank" rel="noopener"
           href="https://map.kakao.com/link/to/${encode(venueName)},${lat},${lng}">
          카카오맵(길찾기)
        </a>

        <a class="btn" id="naverMap" href="#" rel="noopener">네이버지도(위치)</a>
        <a class="btn" id="naverRoute" href="#" rel="noopener">네이버지도(길찾기)</a>
      </div>
    </section>

    <!-- 갤러리 -->
    <section class="card">
      <h2 class="card__title">갤러리</h2>
      <div class="gallery" id="gallery"></div>
    </section>

    <!-- 마음 전하실 곳 -->
    <section class="card">
      <h2 class="card__title">마음 전하실 곳</h2>
      <p class="muted" style="margin:0 0 6px;">카드를 누르면 복사됩니다.</p>
      <div id="accounts"></div>
    </section>

    <!-- RSVP -->
    <section class="card">
      <h2 class="card__title">참석 여부 (RSVP)</h2>
      <p class="muted" style="margin:0 0 12px; line-height:1.6;">링크로 간단히 응답받는 방식이 가장 편합니다.</p>
      <a class="btn btn--primary" target="_blank" rel="noopener" href="${d.rsvpUrl}">참석 여부 남기기</a>
    </section>

    <footer class="footer">${d.footerText}</footer>
  </main>

  <div id="modal" class="modal" aria-hidden="true">
    <div class="modal__backdrop"></div>
    <img id="modalImg" class="modal__img" alt="확대 이미지" />
  </div>
  `;

  // ===== 인트로 타이밍 =====
  const intro = document.getElementById("heroIntro");
  const showcase = document.getElementById("heroShowcase");

  setTimeout(() => intro.classList.add("is-write"), 2000);
  setTimeout(() => document.getElementById("p1")?.classList.add("is-in"), 200);
  setTimeout(() => document.getElementById("p2")?.classList.add("is-in"), 3200);
  setTimeout(() => document.getElementById("p3")?.classList.add("is-in"), 6200);
  setTimeout(() => showcase.classList.add("is-done"), 9000);

  // ===== 네이버 지도 (위치/길찾기) =====
  // 앱 스킴(가능하면 앱으로), 실패하면 웹으로 폴백
  const naverPlaceApp = `nmap://place?lat=${lat}&lng=${lng}&name=${encode(venueName)}&appname=com.example.weddinginvite`;
  const naverRouteApp = `nmap://route/car?dlat=${lat}&dlng=${lng}&dname=${encode(venueName)}&appname=com.example.weddinginvite`;
  const naverWeb = `https://map.naver.com/v5/search/${encode(venueName)}`;

  const naverMap = document.getElementById("naverMap");
  const naverRoute = document.getElementById("naverRoute");

  naverMap.addEventListener("click", (e) => {
    e.preventDefault();
    const start = Date.now();
    window.location.href = naverPlaceApp;
    setTimeout(() => {
      if (Date.now() - start < 1200) window.open(naverWeb, "_blank", "noopener");
    }, 700);
  });

  naverRoute.addEventListener("click", (e) => {
    e.preventDefault();
    const start = Date.now();
    window.location.href = naverRouteApp;
    setTimeout(() => {
      if (Date.now() - start < 1200) window.open(naverWeb, "_blank", "noopener");
    }, 700);
  });

  // ===== 갤러리 + 모달 =====
  const g = $("#gallery");
  d.gallery.forEach((src, i) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = `gallery-${i + 1}`;
    img.loading = "lazy";
    img.addEventListener("click", () => openModal(src));
    g.appendChild(img);
  });

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

  // ===== 계좌 =====
  const acc = $("#accounts");
  d.accounts.forEach((a) => {
    if (!a.number) return;
    const el = document.createElement("div");
    el.className = "account";
    el.innerHTML = `
      <div class="row" style="justify-content:space-between;">
        <span class="muted">${a.label}</span>
        <button class="btn" style="width:auto; padding:6px 10px; font-size:12px;">계좌복사</button>
      </div>
      <b>${a.bank} ${a.number}</b>
      <div class="muted" style="margin-top:4px;">예금주: ${a.holder}</div>
    `;
    const txt = `${a.bank} ${a.number} (${a.holder})`;
    el.addEventListener("click", () => copyText(txt));
    acc.appendChild(el);
  });

  // ===== 캘린더(ICS 다운로드) =====
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
SUMMARY:${bride.name} · ${groom.name} 결혼식
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
}

build();