#!/bin/sh
set -eu

branch_name="${BRANCH_NAME:-$(git branch --show-current)}"
environment="${ENVIRONMENT:-dev}"

if [ -z "$branch_name" ]; then
  branch_name="detached"
fi

branch_slug="$(
  printf '%s' "$branch_name" |
    tr '[:upper:]' '[:lower:]' |
    sed 's/[^a-z0-9_-]/-/g; s/--*/-/g; s/^-//; s/-$//'
)"

if [ -z "$branch_slug" ]; then
  branch_slug="detached"
fi

case "$branch_name" in
  main | master)
    port_offset=0
    ;;
  *)
    port_offset="$(
      printf '%s' "$branch_name" |
        cksum |
        awk '{ print $1 % 1000 }'
    )"
    ;;
esac

export COMPOSE_PROJECT_NAME="cost-detective-${branch_slug}-${environment}"
export API_PORT="${API_PORT:-$((8000 + port_offset))}"
export WEB_PORT="${WEB_PORT:-$((3000 + port_offset))}"

case "$environment" in
  dev | test)
    env_file="config/.env.${environment}"
    ;;
  prod)
    env_file="${ENV_FILE:-config/.env.prod}"
    ;;
  *)
    printf 'Unknown ENVIRONMENT: %s (expected dev, test, or prod)\n' "$environment" >&2
    exit 1
    ;;
esac

if [ ! -f "$env_file" ]; then
  printf 'Missing environment file: %s\n' "$env_file" >&2
  printf 'For production, copy config/.env.prod.example to config/.env.prod and replace its values.\n' >&2
  exit 1
fi

printf 'Branch:          %s\n' "$branch_name"
printf 'Environment:     %s\n' "$environment"
printf 'Compose project: %s\n' "$COMPOSE_PROJECT_NAME"
printf 'Dashboard:       http://localhost:%s/dashboard\n' "$WEB_PORT"
printf 'API:             http://localhost:%s\n' "$API_PORT"

exec docker compose \
  --env-file "$env_file" \
  -f docker-compose.yml \
  -f "compose.${environment}.yml" \
  "$@"
