#!/usr/bin/env bash
set -e

CURRENT_PATH="${PWD}"

RED="\033[1;31m"
GREEN="\033[1;32m"
NOCOLOR="\033[0m"

stack_name="$1"
audit_event_name_prefix="$2"
cri_identifier="$3"

if [ -z "$stack_name" ]; then
  echo -e "😱 ${RED}stack name expected as first argument, e.g. ${GREEN}./deploy.sh my-openBanking-api${NOCOLOR}"
  exit 1
fi

echo -e "👉 deploying ipv-cri-ob-api with:"
echo -e "\tstack name: ${GREEN}$stack_name${NOCOLOR}"

echo -e "🔎 Checking with cfn-lint"
cfn-lint deploy/template.yaml -f pretty
echo -e "🔎 Checking with sam validate --lint"
sam validate -t deploy/template.yaml --lint
echo -e "🧱 Building with SAM"
sam build -t deploy/template.yaml --region eu-west-2
echo -e "🚀 Deploying..."
sam deploy --stack-name "$stack_name" \
  --no-fail-on-empty-changeset \
  --no-confirm-changeset \
  --resolve-s3 \
  --region eu-west-2 \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --tags \
  cri:component=ipv-cri-ob-api \
  cri:stack-type=dev \
  cri:application=Lime \
  cri:deployment-source=manual \
  --parameter-overrides \
  CodeSigningConfigArn=none \
  Environment=dev \
  ParameterPrefix="ipv-cri-ob-api" \
  DeploymentType="not-pipeline" \
  LambdaDeploymentPreference=AllAtOnce
