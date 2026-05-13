#!/usr/bin/env bash

set -e

STACK_NAME="${CFN_StackName:-${SAM_STACK_NAME:-local}}"
ENVIRONMENT="${ENVIRONMENT:-${TEST_ENVIRONMENT:-build}}"

export STACK_NAME ENVIRONMENT

echo "ENVIRONMENT: ${ENVIRONMENT}"
echo "STACK_NAME: ${STACK_NAME}"

if [[ "${STACK_NAME}" != "local" ]]; then
  API_BASE_URL=$(aws ssm get-parameter \
    --name "/tests/${STACK_NAME}/apiBaseUrl" \
    --region eu-west-2 \
    --query "Parameter.Value" \
    --output text)

  export API_BASE_URL
fi

npm run test:api
