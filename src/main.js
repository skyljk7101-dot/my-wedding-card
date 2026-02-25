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
          <span style="flex:1;">정대연 · 자영화의 장녀 <b>${bride.name}</b></span>
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