#!/bin/sh
set -eu

branch_name="${BRANCH_NAME:-$(git branch --show-current)}"
commit_sha="${COMMIT_SHA:-$(git rev-parse --short=7 HEAD)}"
version="${VERSION:-}"

branch_tag="$(
  printf '%s' "$branch_name" |
    tr '[:upper:]' '[:lower:]' |
    sed 's/[^a-z0-9_.-]/-/g; s/--*/-/g; s/^-//; s/-$//'
)"

printf 'Branch tag:  %s\n' "$branch_tag"
printf 'Commit tag:  sha-%s\n' "$commit_sha"

if [ -n "$version" ]; then
  case "$version" in
    v*) version="${version#v}" ;;
  esac

  if ! printf '%s' "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
    printf 'VERSION must use semantic versioning, for example 1.2.0\n' >&2
    exit 1
  fi

  printf 'Version tag: %s\n' "$version"
fi
