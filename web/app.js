/**
 * app.js - 社内FAQ検索・表示システム
 *
 * 機能:
 *   - faq.json を読み込み、FAQを一覧表示
 *   - キーワード検索（質問・回答・カテゴリをリアルタイム検索）
 *   - カテゴリフィルター
 *   - アコーディオン形式で回答を開閉
 */

"use strict";

// ----- 状態管理 -----
let allFaqs = [];         // 全FAQデータ
let activeCategory = "すべて"; // 現在選択中のカテゴリ
let searchQuery = "";     // 現在の検索ワード

// ----- 初期化 -----
document.addEventListener("DOMContentLoaded", () => {
  loadFaqData();

  // 検索ボックスの入力イベント
  document.getElementById("search-input").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderFaqs();
  });

  // 検索クリアボタン
  document.getElementById("clear-btn").addEventListener("click", () => {
    document.getElementById("search-input").value = "";
    searchQuery = "";
    renderFaqs();
  });
});

// ----- JSONデータの読み込み -----
async function loadFaqData() {
  try {
    // faq.json を fetch で読み込む（GitHub Pages でも動作）
    const response = await fetch("./faq.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    allFaqs = data.faqs || [];

    // 最終更新日を表示
    const updatedEl = document.getElementById("last-updated");
    if (updatedEl && data.updated_at) {
      updatedEl.textContent = `最終更新: ${data.updated_at}`;
    }

    // カテゴリフィルターを生成
    buildCategoryFilter();

    // FAQ一覧を表示
    renderFaqs();

  } catch (err) {
    console.error("FAQ データの読み込みに失敗しました:", err);
    document.getElementById("faq-list").innerHTML =
      '<p class="error-message">データの読み込みに失敗しました。<br>faq.json が正しく配置されているか確認してください。</p>';
  }
}

// ----- カテゴリフィルターを生成 -----
function buildCategoryFilter() {
  // カテゴリの重複なし一覧を取得
  const categories = ["すべて", ...new Set(allFaqs.map((f) => f.category))];

  const container = document.getElementById("category-filters");
  container.innerHTML = "";

  categories.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = "category-btn" + (cat === activeCategory ? " active" : "");
    btn.textContent = cat;

    // カテゴリ件数バッジを付与（「すべて」以外）
    if (cat !== "すべて") {
      const count = allFaqs.filter((f) => f.category === cat).length;
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = count;
      btn.appendChild(badge);
    }

    btn.addEventListener("click", () => {
      activeCategory = cat;
      // ボタンのactiveクラスを切り替え
      document.querySelectorAll(".category-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderFaqs();
    });

    container.appendChild(btn);
  });
}

// ----- FAQを絞り込んで表示 -----
function renderFaqs() {
  const query = searchQuery.toLowerCase();

  const filtered = allFaqs.filter((faq) => {
    // カテゴリフィルター
    const matchCategory =
      activeCategory === "すべて" || faq.category === activeCategory;

    // キーワード検索（質問・回答・カテゴリを対象）
    // 回答のHTMLタグを除いてテキストだけで検索
    const plainAnswer = faq.answer.replace(/<br\s*\/?>/gi, " ");
    const matchSearch =
      query === "" ||
      faq.question.toLowerCase().includes(query) ||
      plainAnswer.toLowerCase().includes(query) ||
      faq.category.toLowerCase().includes(query);

    return matchCategory && matchSearch;
  });

  // 件数表示を更新
  const countEl = document.getElementById("result-count");
  if (countEl) {
    countEl.textContent =
      query || activeCategory !== "すべて"
        ? `${filtered.length} 件が一致しました`
        : `全 ${allFaqs.length} 件`;
  }

  // FAQカードを描画
  const list = document.getElementById("faq-list");
  if (filtered.length === 0) {
    list.innerHTML = '<p class="no-result">該当するFAQが見つかりませんでした。<br>別のキーワードで検索してみてください。</p>';
    return;
  }

  list.innerHTML = filtered
    .map((faq) => buildFaqCard(faq, query))
    .join("");

  // アコーディオンのクリックイベントを登録
  list.querySelectorAll(".faq-question").forEach((el) => {
    el.addEventListener("click", () => toggleAccordion(el));
  });
}

// ----- FAQカードのHTMLを生成 -----
function buildFaqCard(faq, query) {
  const highlightedQ = highlight(faq.question, query);
  // 回答はHTMLタグ（<br>）を含むのでハイライトはタグ外のテキストに適用
  const highlightedA = highlightAnswer(faq.answer, query);

  return `
    <div class="faq-card" data-id="${faq.id}">
      <div class="faq-question" role="button" aria-expanded="false" tabindex="0">
        <span class="category-tag">${escapeHtml(faq.category)}</span>
        <span class="question-text">Q. ${highlightedQ}</span>
        <span class="accordion-icon" aria-hidden="true">▼</span>
      </div>
      <div class="faq-answer" aria-hidden="true">
        <div class="answer-content">
          <span class="answer-label">A.</span>
          <div class="answer-text">${highlightedA}</div>
        </div>
      </div>
    </div>
  `;
}

// ----- アコーディオン開閉 -----
function toggleAccordion(questionEl) {
  const card = questionEl.closest(".faq-card");
  const answer = card.querySelector(".faq-answer");
  const isOpen = card.classList.contains("open");

  // 他のカードを閉じる（1つだけ開く場合はコメントを外してください）
  // document.querySelectorAll(".faq-card.open").forEach(c => {
  //   c.classList.remove("open");
  //   c.querySelector(".faq-question").setAttribute("aria-expanded", "false");
  //   c.querySelector(".faq-answer").setAttribute("aria-hidden", "true");
  // });

  if (isOpen) {
    card.classList.remove("open");
    questionEl.setAttribute("aria-expanded", "false");
    answer.setAttribute("aria-hidden", "true");
  } else {
    card.classList.add("open");
    questionEl.setAttribute("aria-expanded", "true");
    answer.setAttribute("aria-hidden", "false");
  }
}

// ----- ユーティリティ: キーワードをハイライト -----
function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const escapedQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escaped.replace(
    new RegExp(`(${escapedQuery})`, "gi"),
    '<mark>$1</mark>'
  );
}

// 回答（<br>タグを含む）内でハイライトを適用
function highlightAnswer(answerHtml, query) {
  if (!query) return answerHtml;
  // テキスト部分のみハイライト（タグ内はスキップ）
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return answerHtml.replace(
    new RegExp(`(?![^<]*>)(${escapedQuery})`, "gi"),
    '<mark>$1</mark>'
  );
}

// ----- ユーティリティ: HTMLエスケープ -----
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
