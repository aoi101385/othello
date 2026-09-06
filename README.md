# オセロ — CPU対戦

ブラウザで遊べるシンプルなオセロです。外部ライブラリは不要です。

- あなたが黒・先手、CPUが白・後手
- 点のあるマスをクリックして着手
- 自動パス、勝敗判定、「最初から」で再開
- パソコン・スマートフォンに対応

## ローカルで遊ぶ

`index.html` をブラウザで開くだけで遊べます。

## GitHub Pagesで公開する

リポジトリの Settings → Pages で、Source を Deploy from a branch、Branch を main、フォルダを / (root) に設定します。

## 開発と検証

Node.jsがあれば、追加パッケージなしで実行できます。

```sh
node scripts/dev.mjs
node scripts/build.mjs
node --test tests/game.test.mjs
```

30局の独立ルール照合、8方向反転、パス・終局、CPU待機中の操作制御、リセット、終局までの対局を自動テストしています。
