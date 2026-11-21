# Builds the API from the monorepo root so npm workspaces resolve.
FROM node:24-slim AS build
WORKDIR /app
# Install OpenSSL for Prisma's migration engine.
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
# Copy every workspace manifest so npm ci matches the lockfile.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY apps/extension/package.json apps/extension/
COPY packages/shared/package.json packages/shared/
RUN npm ci -w apps/api
COPY tsconfig.base.json ./
COPY apps/api apps/api
# Use a placeholder URL because prisma generate reads it but never connects.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm run build -w apps/api

FROM node:24-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
# Copy only what the server needs to run.
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/package.json /app/apps/api/prisma.config.ts apps/api/
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/dist apps/api/dist
WORKDIR /app/apps/api
# Run as a non-root user.
USER node
EXPOSE 4000
# Apply migrations, then start the server.
CMD ["npm", "start"]
