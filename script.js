
"use strict";


const CONFIG = {
  UPI_ID: "9908529507@ibl",
  ORG_NAME: "SIO TOLICHOWKI",
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/https://script.google.com/macros/s/AKfycbwo85JXr0C1xPrgPDG1hg4dlD7q8SB4yCZ1NOA0DcSdZmtWwQ3UZGNvwmNAO0rVlGYq/exec-YiEo3HkqCH4c_HpW1dtrf2AcZDU/exec",
  TOKEN: "sio-donations-2026" // MUST match Apps Script SECRET_TOKEN !!!
};
/* ========================================= */

/* Quote */
const QUOTE = {
  text: "Small acts, when multiplied by millions of people, can transform the world.",
  author: "Howard Zinn"
};

/* DOM references */
const quoteEl = document.getElementById("quoteText");
const authorEl = document.getElementById("quoteAuthor");
const donationForm = document.getElementById("donationForm");
const donateBtn = document.getElementById("donateBtn");
const copyBtn = document.getElementById("copyLink");
const statusIndicator = document.getElementById("statusIndicator");
const msgBox = document.getElementById("message");

authorEl.textContent = QUOTE.author;

/* Typewriter animation */
function typeWriter(text, el, delay = 28) {
  el.textContent = "";
  let i = 0;

  return new Promise((res) => {
    const t = setInterval(() => {
      el.textContent += text.charAt(i++);
      if (i >= text.length) {
        clearInterval(t);
        res();
      }
    }, delay);
  });
}

/* Utilities */
function makeClientRef() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function localIsoWithOffset(date = new Date()) {
  const pad = n => String(n).padStart(2, "0");
  const tz = date.getTimezoneOffset();
  const sign = tz <= 0 ? "+" : "-";
  const abs = Math.abs(tz);
  return (
    `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(abs/60))}:${pad(abs%60)}`
  );
}

function buildUpiUrl({ pa, pn, am, cu = "INR", tn = "" }) {
  const params = new URLSearchParams({ pa, pn, am, cu, tn });
  return `upi://pay?${params.toString()}`;
}

/* UI helpers */
function setStatus(text) {
  statusIndicator.textContent = text || "";
}

function showMessage(text, type = "success") {
  msgBox.style.display = "block";
  msgBox.className = "msg " + (type === "success" ? "success" : type === "warn" ? "warn" : "error");
  msgBox.textContent = text;
}

/* Log to Google Sheets */
async function logToSheet(payload) {
  const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Donations-Token": CONFIG.TOKEN
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    throw new Error("Logging failed: " + res.status);
  }

  return res.json();
}

/* Init */
(async function init() {
  await typeWriter(QUOTE.text, quoteEl, 26);
  await new Promise(r => setTimeout(r, 900));
  document.getElementById("intro").style.display = "none";
  donationForm.style.display = "block";
  donationForm.setAttribute("aria-hidden", "false");
})();

/* Donate */
donateBtn.addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const unit = document.getElementById("unit").value.trim();
  const amountRaw = document.getElementById("amount").value;
  const month = document.getElementById("month").value;

  if (!name) return showMessage("Please enter your name.", "error");
  if (!unit) return showMessage("Please enter your unit / place.", "error");
  if (!amountRaw || Number(amountRaw) <= 0) return showMessage("Enter a valid amount.", "error");
  if (!month) return showMessage("Select a month.", "error");

  donateBtn.disabled = true;
  donateBtn.innerHTML = '<span class="spinner"></span>Initiating…';
  setStatus("Recording donation…");

  const amount = Math.round(Number(amountRaw));
  const clientRef = makeClientRef();

  const payload = {
    timestamp: localIsoWithOffset(),
    name,
    unit,
    month,
    amount,
    status: "INITIATED",
    clientRef
  };

  try {
    await logToSheet(payload);

    const tn = `${month} donation | ${name} | REF:${clientRef}`;
    const upiUrl = buildUpiUrl({
      pa: CONFIG.UPI_ID,
      pn: CONFIG.ORG_NAME,
      am: amount,
      tn
    });

    window.location.href = upiUrl;

    setTimeout(() => {
      showMessage("If the UPI app did not open, use the Copy UPI Link option.", "warn");
      donateBtn.disabled = false;
      donateBtn.textContent = "Donate via UPI";
      setStatus("");
    }, 900);

  } catch (err) {
    console.error(err);
    showMessage("Failed to record donation. Try again.", "error");
    donateBtn.disabled = false;
    donateBtn.textContent = "Donate via UPI";
    setStatus("");
  }
});

/* Copy link fallback */
copyBtn.addEventListener("click", () => {
  const name = document.getElementById("name").value.trim() || "Anonymous";
  const amount = document.getElementById("amount").value || "";
  const month = document.getElementById("month").value || "";
  const clientRef = makeClientRef();
  const tn = `${month} donation | ${name} | REF:${clientRef}`;

  const upiUrl = buildUpiUrl({
    pa: CONFIG.UPI_ID,
    pn: CONFIG.ORG_NAME,
    am: amount,
    tn
  });

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(upiUrl).then(() => {
      showMessage("UPI link copied to clipboard.", "success");
    });
  } else {
    showMessage("Copy not supported on this browser.", "warn");
  }
});

