#!/usr/bin/env bash

set -euo pipefail

STACK_NAME="${SAM_STACK_NAME:-local}"
AWS_REGION="${AWS_REGION:-eu-west-2}"
RUN_IN_CONTAINER="${1:-true}"

echo "STACK_NAME: ${STACK_NAME}"
echo "AWS_REGION: ${AWS_REGION}"
echo "RUN_IN_CONTAINER: ${RUN_IN_CONTAINER}"

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

if [[ -f .env ]]; then
  echo "Loading configuration from .env..."
  set -a
  source .env
  set +a
elif [[ "${STACK_NAME}" != "local" ]]; then
  PUBLIC_API_BASE_URL=$(get_stack_output "${STACK_NAME}" "PublicApiBaseUrl")
  PRIVATE_API_BASE_URL=$(get_stack_output "${STACK_NAME}" "PrivateApiBaseUrl")
  TEST_HARNESS_URL=$(get_stack_output "test-resources" "TestHarnessExecuteUrl")
  ENVIRONMENT=$(get_stack_parameter "${STACK_NAME}" "Environment")

  export PUBLIC_API_BASE_URL
  export PRIVATE_API_BASE_URL
  export TEST_HARNESS_URL
  export ENVIRONMENT
fi

if [[ "${RUN_IN_CONTAINER}" == "true" ]]; then
  pushd /app
  npm run test:api
  popd
else
  npm run test:api
fi
