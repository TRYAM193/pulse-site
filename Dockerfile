# Stage 1: Build React Frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Express Server & Production Runtime
FROM node:20-alpine AS production
WORKDIR /app

# Copy server package definitions
COPY package*.json ./
RUN npm ci --only=production

# Copy server source code and built React frontend
COPY . .
COPY --from=build-frontend /dist ./dist

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
