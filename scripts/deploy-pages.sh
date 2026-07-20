#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Deploy from main so the public build matches the reviewed source." >&2
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Commit or restore tracked changes before deploying." >&2
  exit 1
fi

if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]]; then
  echo "Local main must match origin/main before deploying." >&2
  exit 1
fi

corepack pnpm build

remote_url="$(git remote get-url origin)"
remote_sha="$(git ls-remote origin refs/heads/gh-pages | awk '{print $1}')"
author_name="$(git config user.name)"
author_email="$(git config user.email)"
publish_dir="$(mktemp -d "${TMPDIR:-/tmp}/scrollsplice-pages.XXXXXX")"

cleanup() {
  rm -rf "$publish_dir"
}
trap cleanup EXIT

cp -R dist/. "$publish_dir/"
git -C "$publish_dir" init -q -b gh-pages
git -C "$publish_dir" add .
git -C "$publish_dir" \
  -c "user.name=$author_name" \
  -c "user.email=$author_email" \
  commit -q -m "deploy: publish ScrollSplice judge build"
git -C "$publish_dir" remote add origin "$remote_url"

if [[ -n "$remote_sha" ]]; then
  git -C "$publish_dir" push \
    --force-with-lease="refs/heads/gh-pages:$remote_sha" \
    origin gh-pages
else
  git -C "$publish_dir" push origin gh-pages
fi

echo "Published: https://techinevolution.github.io/scroll-splice/"
