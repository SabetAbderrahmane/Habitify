#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

if [ ! -d "backend/.venv" ]; then
  cd backend
  python -m venv .venv
  source .venv/bin/activate
  pip install -r requirements.txt
  pip install -r ../habitify_testing_pack/testing-requirements.txt
  cd "$REPO_ROOT"
else
  source backend/.venv/bin/activate
fi

pytest habitify_testing_pack/backend_tests -q
