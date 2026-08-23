# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM node:22-alpine AS build
WORKDIR /app
ARG BACKEND_URL=http://backend:8080
ENV NEXT_TELEMETRY_DISABLED=1 BACKEND_URL=$BACKEND_URL
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S enacademy && adduser -S enacademy -G enacademy
COPY --from=build --chown=enacademy:enacademy /app/public ./public
COPY --from=build --chown=enacademy:enacademy /app/.next/standalone ./
COPY --from=build --chown=enacademy:enacademy /app/.next/static ./.next/static
USER enacademy
EXPOSE 3000
CMD ["node","server.js"]
