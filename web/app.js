"use strict";

// ============================================================
// ★ 設定：Googleスプレッドシートを使う場合はURLをここに貼る
//
//   設定方法：
//   1. Googleスプレッドシートを開く
//   2. メニュー「ファイル」→「共有」→「Webに公開」
//   3. 「シート1」「カンマ区切り形式（CSV）」を選んで「公開」
//   4. 表示されたURLをコピーして下の "" に貼り付ける
//   5. このファイルを保存してGitHubにプッシュする
//
//   例: const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/xxx/pub?output=csv";
//
//   空文字のままにすると、faq.json を使用します（Excel運用）
// ============================================================
const SHEET_CSV_URL = "";

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

// ===== データ読み込み（GoogleスプレッドシートまたはJSON） =====
async function loadFaqData() {
  try {
    if (SHEET_CSV_URL) {
      // ---- Googleスプレッドシート（CSV）から読み込む ----
      const res = await fetch(SHEET_CSV_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const csvText = await res.text();
      allFaqs = parseCsv(csvText);
    } else {
      // ---- ローカルの faq.json から読み込む（Excel運用）----
      const res = await fetch("./faq.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      allFaqs = data.faqs || [];
    }

    addBotMessage(
      "こんにちは！総務BOTです。<br>" +
      "知りたい内容をお選びください。<br>" +
      "もしくは質問を入力してください。"
    );
    appendQuickReplies();
    scrollBottom();

  } catch (err) {
    console.error("FAQ読み込みエラー:", err);
    addBotMessage("データの読み込みに失敗しました。<br>しばらく経ってから再試行してください。");
  }
}

// ===== CSV パーサー =====
// Googleスプレッドシートの CSV を FAQリストに変換する
// 1行目はヘッダー（カテゴリ,質問,回答）としてスキップ
function parseCsv(csvText) {
  const lines = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim().split("\n");
  const result = [];

  for (let i = 1; i < lines.length; i++) {   // 0行目はヘッダーなのでスキップ
    const cols = parseCsvLine(lines[i]);
    const category = (cols[0] || "").trim();
    const question  = (cols[1] || "").trim();
    const answer    = (cols[2] || "").trim();

    if (!question || !answer) continue;       // 空行はスキップ

    result.push({
      id:       result.length + 1,
      category: category || "その他",
      question: question,
      answer:   sanitizeAnswer(answer),       // <br>タグを安全に処理
    });
  }
  return result;
}

// CSV の1行をフィールド配列に分解する（ダブルクォート・改行対応）
function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"'; i++;                    // "" → " (エスケープ)
      } else if (ch === '"') {
        inQuote = false;                      // 閉じクォート
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;                       // 開きクォート
      } else if (ch === ",") {
        fields.push(field); field = "";       // フィールド区切り
      } else {
        field += ch;
      }
    }
  }
  fields.push(field);
  return fields;
}

// 回答テキストのサニタイズ
// ・HTMLを無害化しつつ <br> タグだけ改行として残す
// ・セル内改行（\n）も <br> に変換
function sanitizeAnswer(text) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return escaped
    .replace(/&lt;br&gt;/gi, "<br>")         // <br> を改行に復元
    .replace(/\n/g, "<br>");                  // セル内改行も <br> に
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

  const filtered = allFaqs.filter(faq => {
    const matchCat = activeCategory === "すべて" || faq.category === activeCategory;
    const matchQ   = searchQuery === "" || matchQuery(faq, searchQuery);
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
          ${highlight(faq.question, searchQuery)}
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

// ===== キーワードハイライト（トークン単位）=====
function highlight(text, query) {
  if (!query) return escHtml(text);
  let result = escHtml(text);
  // スペース区切りで各トークンをハイライト
  const tokens = normalizeText(query).split(/[\s　]+/).filter(Boolean);
  tokens.forEach(token => {
    const safe = escHtml(token).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`(${safe})`, "gi"), "<mark>$1</mark>");
  });
  return result;
}

// ===== HTML エスケープ =====
function escHtml(t) {
  return String(t)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

// =============================================
// あいまい検索ロジック
// =============================================

/**
 * FAQがクエリにマッチするか判定（3段階）
 * 1. スペース区切りでトークンに分割してAND検索
 * 2. 各トークンを部分一致（substring）で検索
 * 3. 部分一致しなければ部分シーケンス（fuzzy）で検索
 */
function matchQuery(faq, query) {
  const plain  = faq.answer.replace(/<br\s*\/?>/gi, " ");
  const target = normalizeText(`${faq.category} ${faq.question} ${plain}`);
  const tokens = normalizeText(query).split(/[\s　]+/).filter(Boolean);

  return tokens.every(token => {
    // ① 通常の部分一致
    if (target.includes(token)) return true;
    // ② 短すぎるトークンはあいまい検索しない（誤ヒット防止）
    if (token.length < 2) return false;
    // ③ 部分シーケンス（あいまい）一致
    return isSubsequence(token, target);
  });
}

/**
 * テキストを検索用に正規化する
 * ・大文字→小文字
 * ・カタカナ→ひらがな（「コウツウヒ」→「こうつうひ」）
 * ・全角英数→半角
 */
function normalizeText(text) {
  return String(text)
    .toLowerCase()
    // カタカナ → ひらがな
    .replace(/[ァ-ヶ]/g, c =>
      String.fromCharCode(c.charCodeAt(0) - 0x60)
    )
    // 全角英数 → 半角
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c =>
      String.fromCharCode(c.charCodeAt(0) - 0xFEE0)
    );
}

/**
 * 部分シーケンス一致（あいまい検索）
 * patternの全文字がtextに順番通りに含まれるか確認する
 * 例: "有申" が "有給申請方法" にマッチ → true
 */
function isSubsequence(pattern, text) {
  let pi = 0;
  for (let ti = 0; ti < text.length && pi < pattern.length; ti++) {
    if (text[ti] === pattern[pi]) pi++;
  }
  return pi === pattern.length;
}
