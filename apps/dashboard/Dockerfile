FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl ca-certificates \
  && curl -LO "https://dl.k8s.io/release/v1.35.0/bin/linux/amd64/kubectl" \
  && install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl \
  && rm kubectl \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

RUN adduser --disabled-password --gecos "" appuser

COPY --chown=appuser:appuser . .

RUN mkdir -p /app/.next && chown -R appuser:appuser /app/.next

USER appuser

EXPOSE 3000

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]