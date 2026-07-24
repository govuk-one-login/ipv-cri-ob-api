#!/usr/bin/env bash

set -euo pipefail

STACK_NAME="${CFN_STACK_NAME:-${SAM_STACK_NAME:-local}}"
SSM_PREFIX="${SSM_PARAM_PREFIX:-ipv-cri-ob-api}"

echo "STACK_NAME: ${STACK_NAME}"
echo "SSM_PREFIX: ${SSM_PREFIX}"

if [[ -f .env ]]; then
  echo "Loading configuration from .env..."
  set -a
  source .env
  set +a
elif [[ "${STACK_NAME}" != "local" ]]; then
  echo "Fetching test configuration from SSM..."

  API_BASE_URL=$(aws ssm get-parameter \
    --name "/tests/${SSM_PREFIX}/apiUrl" \
    --region eu-west-2 \
    --query "Parameter.Value" \
    --output text) || { echo "ERROR: Failed to fetch API_BASE_URL from SSM"; exit 1; }

  HEADLESS_CORE_STUB_URL=$(aws ssm get-parameter \
    --name "/tests/${SSM_PREFIX}/coreStubUrl" \
    --region eu-west-2 \
    --query "Parameter.Value" \
    --output text) || { echo "ERROR: Failed to fetch HEADLESS_CORE_STUB_URL from SSM"; exit 1; }

  OAUTH_BASE_URL=$(aws ssm get-parameter \
    --name "/tests/${SSM_PREFIX}/oauthBaseUrl" \
    --region eu-west-2 \
    --query "Parameter.Value" \
    --output text) || { echo "ERROR: Failed to fetch OAUTH_BASE_URL from SSM"; exit 1; }

  [[ -n "${API_BASE_URL}" ]] || { echo "ERROR: API_BASE_URL is empty after SSM fetch"; exit 1; }
  [[ -n "${HEADLESS_CORE_STUB_URL}" ]] || { echo "ERROR: HEADLESS_CORE_STUB_URL is empty after SSM fetch"; exit 1; }
  [[ -n "${OAUTH_BASE_URL}" ]] || { echo "ERROR: OAUTH_BASE_URL is empty after SSM fetch"; exit 1; }

  export API_BASE_URL
  export HEADLESS_CORE_STUB_URL
  export OAUTH_BASE_URL
fi

npm run test:api
