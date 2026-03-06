FROM node:20-alpine AS deps
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --omit=dev


FROM node:20-alpine AS builder
WORKDIR /app

COPY . .
RUN npm install
RUN npm run build


FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app ./

EXPOSE 3000

ENV NODE_ENV=production

CMD sh -c "npm run db:migrate && npm run start"
