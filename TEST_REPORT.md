# テスト成績書

作成日: 2026-02-22
対象: 割勘（割勘）計算ロジックユニットテスト

実行環境
- OS: 実行環境に依存（テストはローカル環境で実行）
- Node.js / npm を利用して `jest` によるユニットテストを実行

実行コマンド
```powershell
npm install
npm test
```

実行結果概要
- 実行日時: 2026-02-22
- 実行テストスイート: 1
- 総テスト数: 4
- 合格: 4
- 失敗: 0
- 実行時間: 約0.25s

詳細結果
- TC-EX-01: 基本ケース (1000 split, 500 non-split) with 2 participants — 合格
  - 期待: splitSum=1000, nonSplitSum=500, splitPer=500, perPerson=1000, remainder=0
  - 実測: 上記すべて一致

- TC-EX-02: 端数検証 (25040 split only, 3 participants) — 合格
  - 期待: splitSum=25040, nonSplitSum=0, splitPer=8346, perPerson=8346, remainder=2
  - 実測: 上記すべて一致

- TC-EX-05: 未設定金額は0として扱う — 合格
  - 期待: 未設定(null)は0として扱われる
  - 実測: splitSum=1000, perPerson=500

- additional: mixture with missing fields — 合格
  - 期待/実測: 型変換や欠落フィールドに対する耐性を確認（合致）

出力ファイル
- テスト結果（JSON）: `reports/test-results.json`

総評
- ユニットテスト（割勘計算ロジック）はすべて合格しました。
- テスト対象は計算部分に限定しており、UI や E2E（インポート/表示）等は含みません。

今後の推奨事項
1. インポート/エクスポートの E2E テストを追加（Cypress/Playwright）。
2. JSON スキーマ検証を自動化（スキーマ定義 + インポート時のバリデーションユニット）。
3. セキュリティ（XSS）テストケースを E2E に組み込み、レンダリング時に実行されないことを確認。

---

自動テスト関連ファイル
- `package.json` — テストスクリプト定義
- `js/lib/settlement.js` — テスト対象の計算モジュール
- `tests/settlement.test.js` — Jest テストケース
- `reports/test-results.json` — 生のテスト結果（JSON）

必要なら、この成績書を `PDF` に変換するか、CI/CD（GitHub Actions）に組み込む手順を作成します。