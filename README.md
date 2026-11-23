# RFT for Meta Quest 3S（WebXR・オフライン対応版 v1.1.0）

## ファイル
- index.html … 実験画面（設定・VR実行・データ管理）
- rft-core.js … 試行生成、角度計算、CSV出力（APP_VERSION）
- rft-store.js … Quest 内（IndexedDB）へのデータ蓄積
- sw.js … オフライン起動用（CACHE_NAME）
- manifest.webmanifest, icon-*.png … アプリとして登録する場合の情報
- three.module.js … three.js r169（MIT License、THREE_LICENSE.txt）

## 初回だけ（ネット接続が必要）
1. フォルダの中身をすべて HTTPS のホスティング（GitHub Pages など）に置く。
2. Quest のブラウザでその URL を開き、「オフラインで起動できます」と出ることを確認する。
3. ブックマークに登録する。

## 毎回の実験（ネット不要）
ブックマークから開く → 参加者ID → VRで開始 → 終了後は「5. 保存済みのセッション」から CSV 保存。

## プログラムを更新するとき
1. rft-core.js の APP_VERSION と sw.js の CACHE_NAME を同じ新しい番号にする。
2. ホスティングに上書きする。
3. Quest をネットにつないでページを開き、「新しい版を適用」を押す（実験と実験の間に）。

## データの扱い
- 各試行の終了ごとに Quest 内へ自動保存。
- ブラウザの閲覧データを消去すると消えるため、「全データのバックアップ（JSON）」を定期的に保存。
- バックアップは「バックアップから取り込む」で復元できる（同じセッションは重複しない）。
