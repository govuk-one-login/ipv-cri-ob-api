FROM amazonlinux:2023.11.20260427.1@sha256:82085f72b15db462da227bd8a45c925c72f9d6f25965d22f1c31c47e0a803d80

RUN dnf update -y && dnf install -y awscli

COPY . .
RUN chmod +x /run-tests.sh
ENTRYPOINT ["/run-tests.sh"]
