FROM node:20-alpine

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src/ ./src/

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3009

CMD ["node", "src/index.js"]
