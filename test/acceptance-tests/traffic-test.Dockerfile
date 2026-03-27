FROM amazonlinux:2023.10.20260330.0@sha256:c4543691c8ce4157cbfe7d10170106eccb9dedd61f022980f062788d00e8af51

RUN dnf update -y && dnf install -y awscli

COPY . .
RUN chmod +x /run-traffic-tests.sh
ENTRYPOINT ["/run-traffic-tests.sh"]
