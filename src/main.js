import "./style.css";
import { INVITE } from "./config.js";

const $ = (sel) => document.querySelector(sel);
const encode = (s) => encodeURIComponent(String(s ?? ""));
const pad2 = (n) => String(n).padStart(2, "0");

function build() {
  const d = INVITE;
  const { groom, bride } = d.couple;
  const { lat, lng, venueName } = d.wedding;

  const brideSms = bride.phone.replace(/[^0-9]/g, "");
  const groomSms = groom.phone.replace(/[^0-9]/g, "");

  $("#app").innerHTML = `
  <main class="wrap">

    <header class="heroShowcase" id="heroShowcase">

      <div class="heroFinal">
        <img class="heroFinal__img" src="${d.heroImage}">
        <div class="heroFinal__overlay">
          <div style="font-weight:700;font-size:18px;">DASOM · JAEGI</div>
          <div style="margin-top:6px;">${d.wedding.dateText}</div>
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
            <span class="scribbleLine">Ad nuptias nostras</span><br>
            <span class="scribbleLine">te invitamus</span>
          </div>
        </div>
      </div>
    </header>

    <section class="card">
      <h2 class="card__title">초대합니다</h2>
      <p class="message">“매일 네 하루에 조용히 구독했어.
이제 평생, 내 마음으로만 자동연장되는 사랑💗”</p>

      <div style="margin-top:16px;display:flex;flex-direction:column;gap:10px;">
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
      <h2 class="card__title">RSVP</h2>
      <a class="btn btn--primary" target="_blank" href="${d.rsvpUrl}">참석 여부 남기기</a>
    </section>

  </main>
  `;

  setTimeout(()=>document.getElementById("heroIntro").classList.add("is-write"),2000);
  setTimeout(()=>document.getElementById("p1").classList.add("is-in"),200);
  setTimeout(()=>document.getElementById("p2").classList.add("is-in"),3200);
  setTimeout(()=>document.getElementById("p3").classList.add("is-in"),6200);
  setTimeout(()=>document.getElementById("heroShowcase").classList.add("is-done"),9000);
}

build();