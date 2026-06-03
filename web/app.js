"use strict";

let allFaqs = [];
let activeCategory = "すべて";
let searchQuery = "";

document.addEventListener("DOMContentLoaded", () => {
  loadFaqData();

  document.getElementById("search-input").addEventListener("input", (e) => {
    searchQuery = e.target.value.trim();
    renderFaqs();
  });

  document.getElementById("clear-btn").addEventListener("click", () => {
    document.getElementById("search-input").value = "";
    searchQuery = "";
    renderFaqs();
  });
});

async function loadFaqData() {
  try {
    const res = await fetch("./faq.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allFaqs = data.faqs || [];

    const el = document.getElementById("last-updated");
    if (el && data.updated_at) el.textContent = data.updated_at + " 更新";

    buildCategoryFilter();
    renderFaqs();
  } catch (err) {
    document.getElementById("faq-list").innerHTML =
      '<p class="no-result">データを読み込めませんでした。<br>しばらく待ってから再度お試しください。</p>';
  }
}

function buildCategoryFilter() {
  const categories = ["すべて", ...new Set(allFaqs.map(f => f.category))];
  const container = document.getElementById("category-filters");
  container.innerHTML = "";

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "category-btn" + (cat === activeCategory ? " active" : "");

    const label = document.createTextNode(cat);
    btn.appendChild(label);

    if (cat !== "すべて") {
      const count = allFaqs.filter(f => f.category === cat).length;
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = count;
      btn.appendChild(badge);
    }

    btn.addEventListener("click", () => {
      activeCategory = cat;
      document.querySelectorAll(".category-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderFaqs();
    });

    container.appendChild(btn);
  });
}

function renderFaqs() {
  const query = searchQuery.toLowerCase();

  const filtered = allFaqs.filter(faq => {
    const matchCat = activeCategory === "すべて" || faq.category === activeCategory;
    const plain = faq.answer.replace(/<br\s*\/?>/gi, " ");
    const matchQ =
      query === "" ||
      faq.question.toLowerCase().includes(query) ||
      plain.toLowerCase().includes(query) ||
      faq.category.toLowerCase().includes(query);
    return matchCat && matchQ;
  });

  const countEl = document.getElementById("result-count");
  if (countEl) {
    if (query || activeCategory !== "すべて") {
      countEl.textContent = `「${query || activeCategory}」の検索結果：${filtered.length} 件`;
    } else {
      countEl.textContent = `全 ${allFaqs.length} 件のFAQがあります`;
    }
  }

  const list = document.getElementById("faq-list");
  if (filtered.length === 0) {
    list.innerHTML = '<p class="no-result">該当するFAQが見つかりませんでした。<br>別のキーワードでお試しください。</p>';
    return;
  }

  list.innerHTML = filtered.map(faq => buildFaqCard(faq, query)).join("");

  list.querySelectorAll(".faq-question").forEach(el => {
    el.addEventListener("click", () => toggleAccordion(el));
    el.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") toggleAccordion(el);
    });
  });
}

function buildFaqCard(faq, query) {
  const highlightedQ = highlight(faq.question, query);
  const highlightedA = highlightAnswer(faq.answer, query);

  return `
    <div class="faq-card" data-id="${faq.id}">
      <div class="faq-question" role="button" tabindex="0" aria-expanded="false">
        <div class="q-bubble">
          <span class="category-tag">${escapeHtml(faq.category)}</span>
          <span class="q-text">Q. ${highlightedQ}</span>
          <span class="accordion-icon">▼</span>
        </div>
      </div>
      <div class="faq-answer" aria-hidden="true">
        <div class="answer-row">
          <div class="bubble-avatar">
            <svg viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="14" fill="#1a4fa0"/>
              <rect x="7.5" y="9.5" width="13" height="9.5" rx="2.5" fill="white"/>
              <rect x="10.5" y="12.5" width="2" height="2" rx="1" fill="#1a4fa0"/>
              <rect x="15.5" y="12.5" width="2" height="2" rx="1" fill="#1a4fa0"/>
              <rect x="12" y="15.5" width="4" height="1" rx="0.5" fill="#1a4fa0"/>
              <rect x="12" y="6.5" width="4" height="3" rx="1" fill="white"/>
              <circle cx="14" cy="6" r="1" fill="#7eb3ff"/>
            </svg>
          </div>
          <div class="a-bubble">${highlightedA}</div>
        </div>
      </div>
    </div>`;
}

function toggleAccordion(questionEl) {
  const card = questionEl.closest(".faq-card");
  const isOpen = card.classList.contains("open");
  if (isOpen) {
    card.classList.remove("open");
    questionEl.setAttribute("aria-expanded", "false");
    card.querySelector(".faq-answer").setAttribute("aria-hidden", "true");
  } else {
    card.classList.add("open");
    questionEl.setAttribute("aria-expanded", "true");
    card.querySelector(".faq-answer").setAttribute("aria-hidden", "false");
  }
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const escaped = escapeHtml(text);
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escaped.replace(new RegExp(`(${escapeHtml(safe)})`, "gi"), "<mark>$1</mark>");
}

function highlightAnswer(html, query) {
  if (!query) return html;
  const safe = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.replace(new RegExp(`(?![^<]*>)(${safe})`, "gi"), "<mark>$1</mark>");
}

function escapeHtml(t) {
  return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
