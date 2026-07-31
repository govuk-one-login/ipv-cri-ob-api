FROM amazonlinux:2023@sha256:c1872fb69ff9ed9581c999509dd0dcb4288235087f1df4999b866affdac0278d

RUN dnf install -y nodejs24 awscli && dnf clean all

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY --chmod=+x test/acceptance-tests/run-tests.sh /run-tests.sh
COPY cucumber.mjs tsconfig.json ./
COPY test/acceptance-tests ./test/acceptance-tests

ENTRYPOINT ["/run-tests.sh"]
