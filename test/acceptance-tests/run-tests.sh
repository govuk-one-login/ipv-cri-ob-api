#!/usr/bin/env bash

set -euo pipefail

[[ -f /app/package.json ]] && cd /app

STACK_NAME="${SAM_STACK_NAME:?SAM_STACK_NAME is not set}"
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

get_stack_parameter() {
  local stack="$1" key="$2" value
  value=$(aws cloudformation describe-stacks \
    --stack-name "$stack" \
    --region "$AWS_REGION" \
    --query "Stacks[0].Parameters[?ParameterKey=='${key}'].ParameterValue" \
    --output text) || { echo "ERROR: Failed to fetch '${key}' parameter from '${stack}' stack"; exit 1; }
  [[ -n "${value}" && "${value}" != "None" ]] || { echo "ERROR: Parameter '${key}' is missing or empty in stack '${stack}'" >&2; exit 1; }
  printf '%s' "${value}"
}

PUBLIC_API_BASE_URL=$(get_stack_output "${STACK_NAME}" "PublicApiBaseUrl")
PRIVATE_API_BASE_URL=$(get_stack_output "${STACK_NAME}" "PrivateApiBaseUrl")
TEST_HARNESS_URL=$(get_stack_output "test-resources" "TestHarnessExecuteUrl")
ENVIRONMENT=$(get_stack_parameter "${STACK_NAME}" "Environment")

export PUBLIC_API_BASE_URL
export PRIVATE_API_BASE_URL
export TEST_HARNESS_URL
export ENVIRONMENT

npm run test:api
