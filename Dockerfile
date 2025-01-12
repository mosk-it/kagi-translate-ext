FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache make zip
COPY . .
RUN npm ci
