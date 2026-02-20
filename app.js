// -------- Storage --------
const KEY = "english_trainer_words_v1";

function loadWords() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWords(words) {
  localStorage.setItem(KEY, JSON.stringify(words));
}

// -------- Utils --------
function norm(s) {
  return s.trim().toLowerCase().split(/\s+/).join(" ");
}

function parseVariants(enOrUa) {
  // allow "forest; woods; the forest"
  return enOrUa
    .split(";")
    .map(v => norm(v))
    .filter(Boolean);
}

function pickRandomIndex(n) {
  return Math.floor(Math.random() * n);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

// -------- UI elements --------
const tabAdd = document.getElementById("tabAdd");
const tabTrain = document.getElementById("tabTrain");
const tabStats = document.getElementById("tabStats");

const viewAdd = document.getElementById("viewAdd");
const viewTrain = document.getElementById("viewTrain");
const viewStats = document.getElementById("viewStats");

const uaInput = document.getElementById("uaInput");
const enInput = document.getElementById("enInput");
const addBtn = document.getElementById("addBtn");

const importBtn = document.getElementById("importBtn");
const exportBtn = document.getElementById("exportBtn");
const clearBtn = document.getElementById("clearBtn");
const fileInput = document.getElementById("fileInput");

const modeSelect = document.getElementById("modeSelect");
const nextBtn = document.getElementById("nextBtn");
const promptEl = document.getElementById("prompt");
const answerInput = document.getElementById("answerInput");
const checkBtn = document.getElementById("checkBtn");
const feedbackEl = document.getElementById("feedback");

const sessionPill = document.getElementById("sessionPill");
const okCountEl = document.getElementById("okCount");
const failCountEl = document.getElementById("failCount");

const refreshStats = document.getElementById("refreshStats");
const totalWordsEl = document.getElementById("totalWords");
const hardListEl = document.getElementById("hardList");

// -------- App state --------
let words = loadWords();

// training session state
let currentIndex = -1;
let asked = 0;
let ok = 0;
let fail = 0;

function show(view) {
  viewAdd.classList.add("hidden");
  viewTrain.classList.add("hidden");
  viewStats.classList.add("hidden");

  tabAdd.classList.remove("primary");
  tabTrain.classList.remove("primary");
  tabStats.classList.remove("primary");

  if (view === "add") { viewAdd.classList.remove("hidden"); tabAdd.classList.add("primary"); }
  if (view === "train") { viewTrain.classList.remove("hidden"); tabTrain.classList.add("primary"); }
  if (view === "stats") { viewStats.classList.remove("hidden"); tabStats.classList.add("primary"); }
}

function updateSessionUI() {
  sessionPill.textContent = `${asked} / ${words.length}`;
  okCountEl.textContent = `${ok}`;
  failCountEl.textContent = `${fail}`;
}

function setFeedback(html, kind) {
  feedbackEl.className = kind === "ok" ? "ok" : kind === "bad" ? "bad" : "";
  feedbackEl.innerHTML = html;
}

function pickNext() {
  if (words.length === 0) {
    promptEl.textContent = "Спочатку додай слова";
    setFeedback("", "");
    currentIndex = -1;
    return;
  }
  currentIndex = pickRandomIndex(words.length);

  const item = words[currentIndex];
  const mode = modeSelect.value;

  if (mode === "ua2en") {
    promptEl.textContent = item.ua;
    answerInput.placeholder = "Введи EN…";
  } else {
    promptEl.textContent = item.en;
    answerInput.placeholder = "Введи UA…";
  }

  answerInput.value = "";
  answerInput.focus();
  setFeedback("", "");
}

function checkAnswer() {
  if (currentIndex < 0) return;
  const item = words[currentIndex];
  const mode = modeSelect.value;
  const user = norm(answerInput.value);

  if (!user) return;

  asked += 1;

  let correctVariants;
  let shownCorrect;

  if (mode === "ua2en") {
    correctVariants = parseVariants(item.en);
    shownCorrect = item.en;
  } else {
    correctVariants = parseVariants(item.ua);
    shownCorrect = item.ua;
  }

  const isOk = correctVariants.includes(user);

  if (isOk) {
    ok += 1;
    item.ok = (item.ok || 0) + 1;
    setFeedback("✅ Правильно!", "ok");
  } else {
    fail += 1;
    item.fail = (item.fail || 0) + 1;
    setFeedback(`❌ Ні. Правильно: <b>${escapeHtml(shownCorrect)}</b>`, "bad");
  }

  saveWords(words);
  updateSessionUI();
}

// -------- Add word --------
function addWord() {
  const ua = uaInput.value.trim();
  const en = enInput.value.trim();

  if (!ua || !en) {
    alert("Заповни UA і EN.");
    return;
  }

  words.push({ ua, en, ok: 0, fail: 0 });
  saveWords(words);

  uaInput.value = "";
  enInput.value = "";
  uaInput.focus();
  alert("Додано ✅");
  updateStats();
  updateSessionUI();
}

// -------- Import/Export --------
function exportJson() {
  const blob = new Blob([JSON.stringify(words, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "words.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) throw new Error("JSON має бути масивом");

      // Basic validation + normalization
      const cleaned = data
        .filter(x => x && typeof x.ua === "string" && typeof x.en === "string")
        .map(x => ({
          ua: x.ua.trim(),
          en: x.en.trim(),
          ok: Number(x.ok || 0),
          fail: Number(x.fail || 0)
        }))
        .filter(x => x.ua && x.en);

      words = cleaned;
      saveWords(words);
      alert(`Імпортовано: ${words.length} слів ✅`);
      updateStats();
      updateSessionUI();
      pickNext();
    } catch (e) {
      alert("Помилка імпорту JSON: " + e.message);
    }
  };
  reader.readAsText(file, "utf-8");
}

function clearAll() {
  if (!confirm("Точно очистити все? Це видалить всі слова.")) return;
  words = [];
  saveWords(words);
  ok = 0; fail = 0; asked = 0;
  updateStats();
  updateSessionUI();
  pickNext();
}

// -------- Stats --------
function updateStats() {
  totalWordsEl.textContent = `${words.length}`;

  if (words.length === 0) {
    hardListEl.textContent = "—";
    return;
  }

  const hard = [...words]
    .sort((a, b) => (b.fail || 0) - (a.fail || 0))
    .slice(0, 10);

  hardListEl.innerHTML = hard
    .map(w => `• <b>${escapeHtml(w.ua)}</b> → ${escapeHtml(w.en)} <span class="pill">fail: ${w.fail || 0}</span>`)
    .join("<br>");
}

// -------- Tabs --------
tabAdd.addEventListener("click", () => show("add"));
tabTrain.addEventListener("click", () => { show("train"); pickNext(); });
tabStats.addEventListener("click", () => { show("stats"); updateStats(); });

// -------- Events --------
addBtn.addEventListener("click", addWord);
enInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addWord(); });

nextBtn.addEventListener("click", pickNext);
checkBtn.addEventListener("click", checkAnswer);
answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkAnswer();
});

modeSelect.addEventListener("change", () => pickNext());

exportBtn.addEventListener("click", exportJson);
importBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) importJson(file);
  fileInput.value = "";
});

clearBtn.addEventListener("click", clearAll);
refreshStats.addEventListener("click", updateStats);

// -------- Service worker register --------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

// init
show("add");
updateStats();
updateSessionUI();
