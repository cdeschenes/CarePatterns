# Stage 1 — build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies needed for the build)
RUN npm ci

# Declare build args — these must be passed via compose.yaml `args:` so that
# Vite can embed them in the compiled bundle during `npm run build`.
ARG VITE_API_TOKEN
ARG VITE_REMINDER_POLL_INTERVAL

# Make args visible as env vars during the build step
ENV VITE_API_TOKEN=$VITE_API_TOKEN
ENV VITE_REMINDER_POLL_INTERVAL=$VITE_REMINDER_POLL_INTERVAL

# Copy source and build
COPY . .
RUN npm run build

# Stage 2 — serve
FROM nginx:alpine AS runner

# Remove the default nginx config and replace with ours
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/carepatterns.conf

# Copy the built SPA from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
