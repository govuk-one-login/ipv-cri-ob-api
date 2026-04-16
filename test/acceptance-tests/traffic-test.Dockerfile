FROM amazonlinux:2023.11.20260406.2@sha256:cfa6c2d0270c6517c0e46cb87aed7edcae8d9eb96af5f51814b6ee8680faaa2c

RUN dnf update -y && dnf install -y awscli

COPY . .
RUN chmod +x /run-traffic-tests.sh
ENTRYPOINT ["/run-traffic-tests.sh"]
