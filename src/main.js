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
  setTimeout(() => (el.style.display = "none"), 1400);
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
  const { lat, lng, venueName } = d.wedding;

  $("#app").innerHTML = `
  <main class="wrap">

    <!-- HERO -->
    <header class="heroShowcase" id="heroShowcase">

      <div class="heroFinal">
        <img class="heroFinal__img" src="${d.heroImage}" alt="메인 사진">
        <div class="heroFinal__overlay">
          <div style="font-weight:700; font-size:18px;">
            정대연 ● 장영화의 장녀 정다솜<br>
            유순덕의 장남 <b>이재기</b>
          </div>
        </div>
      </div>

      <div class="heroIntro" id="heroIntro">

        <div class="polStack">
          <div class="introPolaroid introPolaroid--1" id="p1">
            <img class="introPolaroid__img" src="${d.heroPolaroids[0]}">
          </div>

          <div class="introPolaroid introPolaroid--2" id="p2">
            <img class="introPolaroid__img" src="${d.heroPolaroids[1]}">
          </div>

          <div class="introPolaroid introPolaroid--3" id="p3">
            <img class="introPolaroid__img" src="${d.heroPolaroids[2]}">
          </div>
        </div>

        <div class="scribbleWrapper">
          <div class="scribbleLeft">
            <span class="scribbleLine">서로의 하루가 되기로 했습니다.</span><br>
            <span class="scribbleLine">이제는 평생으로.</span>
          </div>
        </div>

      </div>
    </header>

    <!-- 초대 -->
    <section class="card">
      <h2 class="card__title">초대합니다</h2>
      <p class="message">
서로의 하루가 되기로 했습니다.
이제는 평생으로.
      </p>

      <div style="margin-top:14px; display:flex; flex-direction:column; gap:10px;">

        <!-- 신부 먼저 -->
        <div class="row">
          <span class="muted" style="width:42px;">신부</span>
          <span style="flex:1;">정다솜</span>
          <a class="btn" style="width:auto; padding:8px 10px;" href="tel:01024138360">전화</a>
        </div>

        <div class="row">
          <span class="muted" style="width:42px;">신랑</span>
          <span style="flex:1;"><b>이재기</b></span>
          <a class="btn" style="width:auto; padding:8px 10px;" href="tel:01086967101">전화</a>
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
            <div class="muted" style="margin-top:4px;">${d.wedding.address}</div>
          </div>
        </div>
      </div>

      <p style="
        margin-top:18px;
        padding-top:14px;
        border-top:1px dashed rgba(0,0,0,0.12);
        font-size:12px;
        color:#777;
        line-height:1.6;
      ">
      예식장 규정에 따라 화환 반입이 불가하여<br>
      마음만 감사히 받겠습니다.<br>
      (리본띠만 받습니다.)
      </p>
    </section>

    <!-- 오시는 길 -->
    <section class="card">
      <h2 class="card__title">오시는 길</h2>

      <div class="grid2">
        <a class="btn" target="_blank"
          href="https://map.kakao.com/link/map/${encode(venueName)},${lat},${lng}">
          카카오맵(위치)
        </a>

        <a class="btn" target="_blank"
          href="https://map.kakao.com/link/to/${encode(venueName)},${lat},${lng}">
          카카오맵(길찾기)
        </a>
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
      <div id="accounts"></div>
    </section>

    <!-- RSVP -->
    <section class="card">
      <h2 class="card__title">참석 여부 (RSVP)</h2>
      <a class="btn btn--primary" target="_blank" href="${d.rsvpUrl}">
        참석 여부 남기기
      </a>
    </section>

    <footer class="footer">${d.footerText}</footer>

  </main>
  `;

  /* ===== 인트로 애니메이션 ===== */
  const intro = document.getElementById("heroIntro");
  const showcase = document.getElementById("heroShowcase");

  setTimeout(()=>intro.classList.add("is-write"),2000);
  setTimeout(()=>document.getElementById("p1").classList.add("is-in"),200);
  setTimeout(()=>document.getElementById("p2").classList.add("is-in"),3200);
  setTimeout(()=>document.getElementById("p3").classList.add("is-in"),6200);
  setTimeout(()=>showcase.classList.add("is-done"),9000);

  /* ===== 갤러리 렌더링 ===== */
  const g = $("#gallery");
  d.gallery.forEach((src)=>{
    const img = document.createElement("img");
    img.src = src;
    g.appendChild(img);
  });

  /* ===== 계좌 ===== */
  const acc = $("#accounts");
  d.accounts.forEach((a)=>{
    const el = document.createElement("div");
    el.className="account";
    el.innerHTML = `
      <div class="row">
        <span class="muted">${a.label}</span>
      </div>
      <b>${a.bank} ${a.number}</b>
      <div class="muted">예금주: ${a.holder}</div>
    `;
    el.addEventListener("click",()=>copyText(`${a.bank} ${a.number}`));
    acc.appendChild(el);
  });
}

build();