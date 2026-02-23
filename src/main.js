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
    el.style.border = "1px solid rgba(255,255,255,0.18)";
    el.style.background = "rgba(0,0,0,0.65)";
    el.style.color = "rgba(255,255,255,0.92)";
    el.style.fontSize = "13px";
    el.style.zIndex = "999";
    el.style.backdropFilter = "blur(6px)";
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
      <header class="hero">
        <img class="hero__img" src="${d.heroImage}" alt="메인 사진" />
        <div class="hero__overlay">
          <p class="hero__subtitle">WEDDING INVITATION</p>
          <h1 class="hero__title">${groom.name} ♥ ${bride.name}</h1>
          <p class="hero__date">${d.wedding.dateText}</p>
        </div>
      </header>

      <section class="card">
        <h2 class="card__title">초대합니다</h2>
        <p class="message">${d.message}</p>

        <div style="margin-top:14px; display:flex; flex-direction:column; gap:10px;">
          <div class="row">
            <span class="muted" style="width:42px;">신랑</span>
            <span style="flex:1;">${groom.name}</span>
            <a class="btn" style="width:auto; padding:8px 10px;" href="tel:${groom.phone}">전화</a>
          </div>
          <div class="row">
            <span class="muted" style="width:42px;">신부</span>
            <span style="flex:1;">${bride.name}</span>
            <a class="btn" style="width:auto; padding:8px 10px;" href="tel:${bride.phone}">전화</a>
          </div>
        </div>
      </section>

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

        <div style="margin-top:14px; padding:12px; border-radius:14px; border:1px dashed rgba(255,255,255,0.12); display:flex; justify-content:space-between; align-items:center;">
          <div class="muted">D-Day</div>
          <div id="countdown" style="font-weight:800; font-variant-numeric:tabular-nums;">계산 중…</div>
        </div>

        <div style="margin-top:12px;">
          <button id="addCal" class="btn btn--primary">캘린더에 추가</button>
        </div>
      </section>

      <section class="card">
        <h2 class="card__title">오시는 길</h2>
        <p class="muted" style="margin:0 0 12px; line-height:1.6;">버튼을 누르면 지도 앱/웹으로 이동합니다.</p>

        <div class="grid2">
          <a class="btn" target="_blank" rel="noopener"
             href="https://map.kakao.com/link/map/${encode(venueName)},${lat},${lng}">카카오맵(위치)</a>
          <a class="btn" target="_blank" rel="noopener"
             href="https://map.kakao.com/link/to/${encode(venueName)},${lat},${lng}">카카오맵(길찾기)</a>

          <button id="naverApp" class="btn">네이버지도(앱)</button>
          <a class="btn" target="_blank" rel="noopener"
             href="https://map.naver.com/v5/search/${encode(venueName)}">네이버지도(웹)</a>
        </div>
      </section>

      <section class="card">
        <h2 class="card__title">갤러리</h2>
        <div class="gallery" id="gallery"></div>
      </section>

      <section class="card">
        <h2 class="card__title">마음 전하실 곳</h2>
        <p class="muted" style="margin:0 0 6px;">카드를 누르면 복사됩니다.</p>
        <div id="accounts"></div>
      </section>

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

  // 네이버 지도 앱 스킴 + 웹 폴백
  $("#naverApp").addEventListener("click", () => {
    const app = `nmap://place?lat=${lat}&lng=${lng}&name=${encode(venueName)}&appname=com.example.weddinginvite`;
    const web = `https://map.naver.com/v5/search/${encode(venueName)}`;
    const start = Date.now();
    window.location.href = app;
    setTimeout(() => {
      if (Date.now() - start < 1200) window.open(web, "_blank", "noopener");
    }, 700);
  });

  // 갤러리
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

  // 계좌
  const acc = $("#accounts");
  d.accounts.forEach((a) => {
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

  // 카운트다운
  const target = new Date(d.wedding.dateTimeISO).getTime();
  const cd = $("#countdown");
  const timer = setInterval(() => {
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) {
      cd.textContent = "오늘입니다 💐";
      clearInterval(timer);
      return;
    }
    const sec = Math.floor(diff / 1000);
    const days = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    cd.textContent = `${days}일 ${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  }, 1000);

  // 캘린더 추가(ics 다운로드)
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
SUMMARY:${groom.name} ♥ ${bride.name} 결혼식
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