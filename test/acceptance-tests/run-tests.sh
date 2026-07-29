#!/usr/bin/env bash

set -euo pipefail

STACK_NAME="${SAM_STACK_NAME:-local}"
AWS_REGION="${AWS_REGION:-eu-west-2}"

echo "STACK_NAME: ${STACK_NAME}"
echo "AWS_REGION: ${AWS_REGION}"

get_stack_output() {
  local stack="$1" key="$2" value
  value=$(aws cloudformation describe-stacks \
    --stack-name "$stack" \
    --region "$AWS_REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='${key}'].OutputValue" \
    --output text) || { echo "ERROR: Failed to fetch '${key}' output from '${stack}' stack"; exit 1; }
  [[ -n "${value}" && "${value}" != "None" ]] || { echo "ERROR: Output '${key}' is missing or empty in stack '${stack}'" >&2; exit 1; }
  printf '%s' "${value}"
}

if [[ -f .env ]]; then
  echo "Loading configuration from .env..."
  set -a
  source .env
  set +a
elif [[ "${STACK_NAME}" != "local" ]]; then
  PUBLIC_API_BASE_URL=$(get_stack_output "${STACK_NAME}" "PublicApiBaseUrl")
  PRIVATE_API_BASE_URL=$(get_stack_output "${STACK_NAME}" "PrivateApiBaseUrl")
  CORE_STUB_URL=$(get_stack_output "test-resources" "TestHarnessExecuteUrl")

  export PUBLIC_API_BASE_URL
  export PRIVATE_API_BASE_URL
  export CORE_STUB_URL
fi

[[ -d /app ]] && cd /app
npm run test:api
