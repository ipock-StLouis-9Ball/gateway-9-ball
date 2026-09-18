FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm install
COPY js/ ./js/
COPY server/ ./server/
WORKDIR /app/server
RUN npm run build
RUN npm prune --production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "dist/index.js"]
