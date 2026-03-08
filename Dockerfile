FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY . .

ARG JWT_SECRET
ENV JWT_SECRET=$JWT_SECRET

RUN npm install
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

COPY --from=builder /app ./

EXPOSE 3000
ENV NODE_ENV=production

CMD sh -c "npm run db:migrate && npm run start"