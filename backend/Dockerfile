FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
COPY scripts ./scripts
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/server.js"]
