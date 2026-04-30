#!/usr/bin/env bash

set -e

# Added to accommodate ssm stack
if [[ -z "${CFN_StackName}" ]]; then
  if [[ -z "${SAM_STACK_NAME}" ]]; then
    export STACK_NAME="local"
  else
    export STACK_NAME="${SAM_STACK_NAME}"
  fi
else
  export STACK_NAME="${CFN_StackName}"
fi

# Added to accommodate ssm stack
if [[ -z "${ENVIRONMENT}" ]]; then
  if [[ -z "${TEST_ENVIRONMENT}" ]]; then
    export ENVIRONMENT="build"
  else
    export ENVIRONMENT="${TEST_ENVIRONMENT}"
  fi
else
  export ENVIRONMENT="${ENVIRONMENT}"
fi

echo "ENVIRONMENT ${ENVIRONMENT}"
echo "STACK_NAME ${STACK_NAME}"

if [ "${STACK_NAME}" != "local" ]; then
  PARAMETERS_NAMES=(API_BASE_URL)
  for param in "${PARAMETERS_NAMES[@]}"; do
    echo "/tests/$STACK_NAME/${param}"
    PARAMETER=$(aws ssm get-parameter --name "/tests/$STACK_NAME/${param}" --region eu-west-2)
    VALUE=$(echo "$PARAMETER" | jq -r '.Parameter.Value')
    NAME=$(echo "$PARAMETER" | jq -r '.Parameter.Name' | cut -d "/" -f4)

    export "${NAME}=${VALUE}"
  done
fi

npm ci
npm run test:api
