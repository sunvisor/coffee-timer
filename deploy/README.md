# Cloudflare への公開

Cloudflare Workers の Static Assets で `app/dist` を公開します。
サーバーコードやデータベースは不要です。

## 初回の準備

Node.js 24 と npm、Cloudflare アカウントを用意してください。
リポジトリのルートで次を実行します。

```sh
npm ci --prefix deploy
npm run login --prefix deploy
npm run whoami --prefix deploy
```

すでに `deploy` ディレクトリ内にいる場合は、`--prefix deploy` を付けずに実行します。

```sh
npm ci
npm run login
npm run whoami
```

ログイン時にブラウザーが開きます。公開先のアカウントで認証してください。
複数アカウントを利用している場合は、公開先を指定してください。

```sh
export CLOUDFLARE_ACCOUNT_ID='your-account-id'
```

公開名は `deploy/wrangler.jsonc` の `name`（初期値 `coffee-timer`）です。
同じアカウント内に同名の Worker があれば、その Worker を更新します。
別名で公開する場合は `name` を変更するか、実行時に `--name` を指定してください。

## 公開

```sh
./deploy/deploy.sh
```

`deploy` ディレクトリ内にいる場合は `./deploy.sh` を実行してください。

スクリプトは作業ディレクトリに依存せず、次を順に実行します。

1. `deploy` と `app` の依存関係をロックファイルからインストール
2. TypeScript の型チェックと Vite の本番ビルド
3. Wrangler で `app/dist` をアップロードして公開

途中でエラーになった場合は停止します。公開 URL は成功時に Wrangler が表示します。
既定では `workers.dev` に公開します。初回にサブドメインの設定を求められた場合は、Wrangler の案内に従ってください。

公開せず、ビルドとデプロイ設定だけを確認する場合：

```sh
./deploy/deploy.sh --dry-run
```

Wrangler の `deploy` オプションはそのまま渡せます。

```sh
./deploy/deploy.sh --name my-coffee-timer
```

## CI で実行する場合

Cloudflare の Workers デプロイ用 API トークンを CI のシークレットに登録し、
`CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を環境変数として渡してください。
トークンをスクリプト、設定ファイル、コミットに含める必要はありません。

## レシピについて

レシピは利用者ごとのブラウザーに保存されます。
ローカル環境のレシピは公開先へ自動では移りません。
移行する場合はローカルの設定画面で JSON を保存し、公開先の設定画面で読み込んでください。

## 公式ドキュメント

- [Static Assets の公開](https://developers.cloudflare.com/workers/static-assets/get-started/)
- [Wrangler の deploy コマンド](https://developers.cloudflare.com/workers/wrangler/commands/workers/)
- [認証用の環境変数](https://developers.cloudflare.com/workers/wrangler/system-environment-variables/)
