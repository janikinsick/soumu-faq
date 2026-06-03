# 総務部 社内FAQシステム

Excelで管理するQ&AをWebサイトとして公開するシステムです。  
GitHubにプッシュするだけで、誰でもアクセスできるサイトに自動反映されます。

---

## ファイル構成

```
soumu-FAQ/
├── data/
│   └── faq_data.xlsx       ← ★ Q&AのExcelファイルをここに置く
├── web/
│   ├── index.html          ← FAQサイト本体（編集不要）
│   ├── style.css           ← デザイン（編集不要）
│   ├── app.js              ← 動作ロジック（編集不要）
│   └── faq.json            ← 変換後データ（自動生成）
├── convert.py              ← Excel→JSON変換スクリプト
└── .github/workflows/
    └── deploy.yml          ← 自動デプロイ設定（編集不要）
```

---

## Excelファイルの形式

`data/faq_data.xlsx` を以下の形式で作成・編集してください。

| A列（カテゴリ） | B列（質問）             | C列（回答）                      |
|---------------|------------------------|--------------------------------|
| 勤怠・休暇      | 有給休暇の申請方法は？    | 社内ポータルから申請できます...      |
| 経費・精算      | 交通費の精算方法は？      | 経費精算システムから申請...          |

- **1行目はヘッダー行**（「カテゴリ」「質問」「回答」と記入してください）
- **2行目以降**にQ&Aデータを入力してください
- 回答欄に **`<br>`** と入力すると、サイト上で改行として表示されます
  - 例: `詳細は以下の通りです<br>・月曜は休業<br>・火〜金は9時〜17時`
- Excelのセル内改行（`Alt + Enter`）も改行として表示されます

---

## 日常の運用手順

### Q&Aを追加・編集したとき

1. `data/faq_data.xlsx` を編集・保存する
2. GitHubにファイルをプッシュする（またはGitHub上で直接編集）
3. 自動でJSONに変換され、サイトが更新される（数分かかります）

### ローカルで変換だけしたいとき（Gitなしで確認したい場合）

```bash
# 初回のみ（Pythonライブラリのインストール）
pip install openpyxl

# 変換実行
python convert.py
```

実行後、`web/faq.json` が更新されます。

---

## 初期セットアップ（GitHubへの公開）

### 1. GitHubリポジトリの作成

1. GitHub（https://github.com）でアカウント作成・ログイン
2. 「New repository」でリポジトリを作成
   - Repository name: `soumu-faq`（任意）
   - Visibility: Private（社内のみ）または Public
3. このフォルダの内容をプッシュ

```bash
git init
git add .
git commit -m "初期コミット"
git remote add origin https://github.com/ユーザー名/soumu-faq.git
git push -u origin main
```

### 2. GitHub Pages の有効化

1. GitHubリポジトリの「Settings」タブを開く
2. 左メニューの「Pages」をクリック
3. Source を「**GitHub Actions**」に変更して保存
4. `data/faq_data.xlsx` をコミット&プッシュするとデプロイが実行される
5. `https://ユーザー名.github.io/soumu-faq/` でアクセスできるようになる

---

## カスタマイズ

### サイトのタイトル・説明を変更したい

`web/index.html` の以下の部分を編集してください。

```html
<title>総務部 社内FAQシステム</title>
...
<h1>総務部 よくある質問（FAQ）</h1>
<p class="subtitle">説明テキスト</p>
```

### Excelの列構成を変更したい

`convert.py` の設定エリアを編集してください。

```python
COL_CATEGORY = 1  # A列: カテゴリ
COL_QUESTION  = 2  # B列: 質問
COL_ANSWER    = 3  # C列: 回答
```

---

## よくある質問（システム管理者向け）

**Q. サイトが更新されない**  
→ GitHubの「Actions」タブでワークフローの実行状況を確認してください。

**Q. ローカルで表示確認したい**  
→ `web/`フォルダをVS CodeのLive Serverや以下のコマンドで確認できます：
```bash
cd web
python -m http.server 8000
# ブラウザで http://localhost:8000 を開く
```

**Q. Excelを使わずにJSONを直接編集したい**  
→ `web/faq.json` を直接編集できますが、次回 convert.py を実行すると上書きされます。
