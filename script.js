
"use strict";


const CONFIG = {
  UPI_ID: "9908529507@ibl",
  ORG_NAME: "SIO TOLICHOWKI",
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbx4mL63sdUeQVBV7geccs2V6RL8q6CTqWF5TG60GT6tHiwPxjQgsg5FKTephNU77sCl/exec",
  TOKEN: "sio-TEST" // MUST match Apps Script SECRET_TOKEN !!!
};
/* ========================================= */

/* Quote */
const QUOTE = {
  text: "And spend in the way of Allah and do not throw [yourselves] with your [own] hands into destruction [by refraining]. And do good; indeed, Allah loves the doers of good.",
  author: "Al-Baqarah : 195"
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
  const formBody = new URLSearchParams({
    token: CONFIG.TOKEN,
    timestamp: payload.timestamp,
    name: payload.name,
    unit: payload.unit,
    month: payload.month,
    amount: payload.amount,
    status: payload.status,
    clientRef: payload.clientRef
  });

  const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formBody.toString()
  });

  if (!res.ok) {
    throw new Error("Logging failed");
  }

  return res.text();
}


/* Init */
(function init() {
  quoteEl.textContent = QUOTE.text;

  setTimeout(() => {
    document.getElementById("intro").style.display = "none";
    donationForm.style.display = "block";
    donationForm.setAttribute("aria-hidden", "false");
  }, 4000); // overall intro duration
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

