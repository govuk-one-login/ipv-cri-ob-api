FROM amazonlinux:2023.11.20260413.0@sha256:ceeab7e010ed03ea155cfbbfd7140672eba5a49e1110b8b4ed35342312c3f21a

RUN dnf update -y && dnf install -y awscli

COPY . .
RUN chmod +x /run-tests.sh
ENTRYPOINT ["/run-tests.sh"]
