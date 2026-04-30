FROM node:24-slim

RUN apt-get update && apt-get install -y \
    curl \
    unzip \
    gnupg \
    jq \
    bash \
    && rm -rf /var/lib/apt/lists/*

COPY test/public-keys/aws-cli.gpg aws-cli.gpg

RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip.sig" -o "awscliv2.zip.sig" \
    && gpg --import aws-cli.gpg \
    && gpg --verify awscliv2.zip.sig awscliv2.zip \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip awscliv2.zip.sig aws-cli.gpg aws/

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

COPY test/acceptance-tests/run-tests.sh /run-tests.sh
RUN chmod +x /run-tests.sh

ENTRYPOINT ["/run-tests.sh"]
