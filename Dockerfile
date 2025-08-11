# Multi-stage build for Vite + React (static site)

# 1) Build stage
FROM node:22-alpine AS build
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci

# Build
COPY . .
RUN npm run build

# 2) Runtime stage (Node with serve)
FROM node:22-alpine AS runtime
WORKDIR /app

# Install a lightweight static file server
RUN npm i -g serve

# Copy built assets
COPY --from=build /app/dist ./dist

# Expose the port you requested
EXPOSE 5173

# Serve the built app on port 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
