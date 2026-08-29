FROM oven/bun:1 AS base
WORKDIR /app

# Instala dependências
COPY backend/package.json backend/bun.lockb ./
RUN bun install --frozen-lockfile

# Copia código fonte
COPY backend/ .

# Expõe porta e roda
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
