"use strict";

// ===== 状態 =====
let allFaqs        = [];
let activeCategory = "すべて";
let searchQuery    = "";

// チャット履歴 [{ role:'bot'|'user', content:string }]
const chatHistory  = [];

// ===== 起動 =====
document.addEventListener("DOMContentLoaded", () => {
  loadFaqData();

  const input  = document.getElementById("search-input");
  const sendBtn = document.getElementById("send-btn");

  // 入力でリアルタイムフィルタリング
  input.addEventListener("input", () => {
    searchQuery = input.value.trim();
    updateQuickReplies();
  });

  // 送信ボタン or Enterでも検索
  sendBtn.addEventListener("click", () => {
    searchQuery = input.value.trim();
    updateQuickReplies();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      searchQuery = input.value.trim();
      updateQuickReplies();
    }
  });
});

// ===== JSONデータ読み込み =====
async function loadFaqData() {
  try {
    const res = await fetch("./faq.json");
    if (!res.ok) throw new Error();
    const data = await res.json();
    allFaqs = data.faqs || [];

    // 最初の挨拶を表示
    addBotMessage(
      "こんにちは！総務BOTです。<br>" +
      "知りたい内容をお選びください。<br>" +
      "もしくは質問を入力してください。"
    );

    // クイックリプライパネルを追加
    appendQuickReplies();

    scrollBottom();
  } catch {
    addBotMessage("データの読み込みに失敗しました。<br>しばらく経ってから再試行してください。");
  }
}

// ===== チャット履歴にBotメッセージを追加して描画 =====
function addBotMessage(html) {
  chatHistory.push({ role: "bot", content: html });
  renderChatHistory();
}

// ===== チャット履歴にユーザーメッセージを追加して描画 =====
function addUserMessage(text) {
  chatHistory.push({ role: "user", content: escHtml(text) });
  renderChatHistory();
}

// ===== チャット履歴全体を描画 =====
function renderChatHistory() {
  const body = document.getElementById("chat-body");
  // クイックリプライパネルを一時退避
  const qrPanelEl = body.querySelector(".qr-panel");

  body.innerHTML = chatHistory.map(msg =>
    msg.role === "bot" ? buildBotBubble(msg.content) : buildUserBubble(msg.content)
  ).join("");

  // 退避していたパネルを末尾に戻す
  if (qrPanelEl) {
    body.appendChild(qrPanelEl);
  }
}

// ===== Botバブル HTML =====
function buildBotBubble(html) {
  return `
    <div class="bot-row">
      <div class="bot-avatar">${botAvatarSvg()}</div>
      <div class="bot-bubble">${html}</div>
    </div>`;
}

// ===== ユーザーバブル HTML =====
function buildUserBubble(html) {
  return `<div class="user-row"><div class="user-bubble">${html}</div></div>`;
}

// ===== クイックリプライパネルを body 末尾に追加 =====
function appendQuickReplies() {
  const body = document.getElementById("chat-body");
  const panel = document.createElement("div");
  panel.className = "qr-panel";
  panel.id = "qr-panel";
  body.appendChild(panel);
  renderQuickReplies(panel);
}

// ===== クイックリプライを更新（フィルタ適用） =====
function updateQuickReplies() {
  const panel = document.getElementById("qr-panel");
  if (panel) renderQuickReplies(panel);
}

function renderQuickReplies(panel) {
  if (!panel) return;
  const categories = ["すべて", ...new Set(allFaqs.map(f => f.category))];
  const query = searchQuery.toLowerCase();

  const filtered = allFaqs.filter(faq => {
    const matchCat = activeCategory === "すべて" || faq.category === activeCategory;
    const plain    = faq.answer.replace(/<br\s*\/?>/gi, " ");
    const matchQ   =
      query === "" ||
      faq.question.toLowerCase().includes(query) ||
      plain.toLowerCase().includes(query) ||
      faq.category.toLowerCase().includes(query);
    return matchCat && matchQ;
  });

  // カテゴリタブ
  const tabs = categories.map(cat => `
    <button class="qr-tab${cat === activeCategory ? " active" : ""}"
            data-cat="${escHtml(cat)}">${escHtml(cat)}</button>
  `).join("");

  // ボタン一覧
  const buttons = filtered.length
    ? filtered.map(faq => `
        <button class="qr-btn" data-id="${faq.id}">
          ${highlight(faq.question, query)}
        </button>`).join("")
    : `<p class="qr-empty">該当するFAQが見つかりませんでした</p>`;

  panel.innerHTML = `
    <div class="qr-tabs">${tabs}</div>
    <div class="qr-container">${buttons}</div>`;

  // カテゴリタブのクリック
  panel.querySelectorAll(".qr-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderQuickReplies(panel);
    });
  });

  // 質問ボタンのクリック
  panel.querySelectorAll(".qr-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const faq = allFaqs.find(f => f.id === Number(btn.dataset.id));
      if (!faq) return;

      // ユーザーメッセージ（質問）を追加
      addUserMessage(faq.question);

      // Botの回答を追加
      addBotMessage(faq.answer);

      // 検索クリア
      document.getElementById("search-input").value = "";
      searchQuery = "";
      activeCategory = "すべて";

      scrollBottom();
    });
  });
}

// ===== 末尾にスクロール =====
function scrollBottom() {
  const body = document.getElementById("chat-body");
  if (body) body.scrollTop = body.scrollHeight;
}

// ===== Bot アバター SVG =====
function botAvatarSvg() {
  return `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="23" fill="white" stroke="#ddd" stroke-width="1.5"/>
    <rect x="12" y="17" width="24" height="17" rx="5" fill="#2563c8"/>
    <circle cx="19" cy="25" r="3" fill="white"/>
    <circle cx="29" cy="25" r="3" fill="white"/>
    <circle cx="19" cy="25" r="1.5" fill="#2563c8"/>
    <circle cx="29" cy="25" r="1.5" fill="#2563c8"/>
    <rect x="20" y="30" width="8" height="1.8" rx=".9" fill="white"/>
    <rect x="21" y="12" width="6" height="5" rx="1.5" fill="#2563c8"/>
    <circle cx="24" cy="11" r="2" fill="#2563c8"/>
    <circle cx="24" cy="10" r="1.2" fill="#7eb3ff"/>
    <rect x="10" y="20" width="3" height="8" rx="1.5" fill="#2563c8"/>
    <rect x="35" y="20" width="3" height="8" rx="1.5" fill="#2563c8"/>
  </svg>`;
}

// ===== キーワードハイライト =====
function highlight(text, query) {
  if (!query) return escHtml(text);
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escHtml(text).replace(new RegExp(`(${escHtml(safe)})`, "gi"), "<mark>$1</mark>");
}

// ===== HTML エスケープ =====
function escHtml(t) {
  return String(t)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}
