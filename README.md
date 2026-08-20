# 隨機工時分配表

為多個專案產生符合每日工時上下限的隨機工時分配表，純前端執行，部署在 GitHub Pages。

**線上版本**：https://crs-ai-team.github.io/product-plan-tools/

## 功能

- **精確均勻抽樣**：以動態規劃計算合法組合數後逐格抽樣，直接命中符合條件的結果，不需要反覆重抽。
- **可重現**：每張表都對應一組 8 碼種子。貼上別人的種子，或直接開分享連結，就能看到完全相同的表格。
- **即時重算**：任何參數一改動，表格、統計數字與分享連結同步更新，不會出現彼此對不上的狀態。
- **熱力表格**：色塊深淺對應投入時數，一眼看出忙碌分佈；表頭與首欄固定，寬表格也好讀。
- **可改名**：點專案名稱即可改成實際的專案名，會保存在瀏覽器裡。
- **匯出**：CSV（含 BOM，Excel 開中文不亂碼）與 XLSX（含粗體表頭、凍結窗格）。
- **深色模式**：跟隨系統設定，也可以手動切換。

## 參數說明

| 參數 | 說明 | 範圍 |
| --- | --- | --- |
| 專案數量 | 表格的列數 | 1–20 |
| 天數 | 表格的欄數 | 1–31 |
| 最小工時 | 每天所有專案加總的下限 | 1–12 |
| 最大工時 | 每天所有專案加總的上限 | 1–12 |
| 單案每日上限 | 單一專案一天最多幾小時 | 1–8 |
| 亂數種子 | 決定結果的 8 碼十六進位值 | 00000000–FFFFFFFF |

若「最小工時」超過「專案數量 × 單案每日上限」，代表這組參數無解，介面會直接標示原因並停用產生。

## 演算法

每一天獨立處理：

1. 在 `[最小工時, 最大工時]` 之中挑一個實際可行的每日總工時。
2. 把這個總工時拆給各專案，每個專案分到 `0` 到「單案每日上限」之間的整數。

第 2 步用一張 `ways[i][s]`（還剩 `i` 個專案要分、總和必須是 `s` 的組合數）的表，逐格依照真實比例抽樣，因此結果在所有合法組合上是均勻分佈的。

亂數來源是 mulberry32，同一顆種子必定產生同一組序列，這是分享連結能重現結果的基礎。

## 開發

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # 產生器與匯出的單元測試
npm run typecheck
npm run build      # 靜態輸出到 out/
```

## 部署

推上 `main` 後由 `.github/workflows/deploy.yml` 自動建置並發佈到 GitHub Pages。

首次啟用需要到 repository 的 **Settings → Pages → Build and deployment**，把 Source 設成 **GitHub Actions**。

站台位於 `/product-plan-tools/` 子路徑，因此 `next.config.ts` 設定了 `basePath` 與 `assetPrefix`；`public/.nojekyll` 用來避免 GitHub Pages 忽略 `_next/` 目錄。

## 技術

Next.js 16（App Router，`output: 'export'`）、React 19、TypeScript、Tailwind CSS 4。

XLSX 由 `src/lib/zip.ts` 與 `src/lib/export.ts` 直接組出（store-only ZIP + OOXML），不依賴第三方試算表套件。

## 專案結構

```
src/
├── app/
│   ├── layout.tsx        # HTML 外殼、字型、主題預先套用
│   ├── page.tsx          # 狀態流與版面
│   └── globals.css       # 設計 token 與元件樣式
├── components/
│   ├── ControlPanel.tsx  # 參數面板
│   ├── NumberField.tsx   # 滑桿 + 數字輸入
│   ├── ResultTable.tsx   # 熱力表格
│   └── ThemeToggle.tsx   # 深淺色切換
└── lib/
    ├── generator.ts      # 抽樣演算法與參數驗證
    ├── rng.ts            # mulberry32 與種子字串轉換
    ├── params.ts         # 網址參數與 localStorage
    ├── export.ts         # CSV / XLSX
    └── zip.ts            # 極簡 ZIP 封裝
```

## 來源

移植自內部的 Streamlit 工具 `Random_Number_Project_Tools`。原版需要 Python 執行環境，這一版是純靜態網頁，開啟連結就能用。
