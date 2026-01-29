#!/usr/bin/env bash
# Bundle secrets scanner for CI/CD
# Checks Next.js build output for secret patterns

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .next/static directory exists
if [ ! -d ".next/static" ]; then
  echo -e "${RED}Error: .next/static directory not found. Run 'npm run build' first.${NC}"
  exit 1
fi

# Secret patterns to detect
PATTERNS=(
  "service_role"
  "sk_live"
  "sk_test"
  "DATABASE_URL"
  "DIRECT_URL"
  "RESEND_API_KEY"
  "VAPID_PRIVATE"
  "RC_CLIENT_SECRET"
  "supabase_service"
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" # JWT header pattern
  "UPSTASH_REDIS_REST_TOKEN"
)

echo "Scanning .next/static/chunks/ for secrets..."
echo "Patterns checked: ${#PATTERNS[@]}"
echo ""

FOUND_SECRETS=0

for pattern in "${PATTERNS[@]}"; do
  if grep -r "$pattern" .next/static/chunks/ 2>/dev/null; then
    echo -e "${RED}[FAIL]${NC} Found secret pattern: $pattern"
    FOUND_SECRETS=1
  fi
done

echo ""
if [ $FOUND_SECRETS -eq 0 ]; then
  echo -e "${GREEN}[PASS]${NC} No secrets found in client bundle"
  exit 0
else
  echo -e "${RED}[FAIL]${NC} Secrets detected in client bundle!"
  echo "Review the matches above and ensure no sensitive data is exposed."
  exit 1
fi
