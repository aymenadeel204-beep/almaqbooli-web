FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5173
ENV PORT=5173
CMD ["node", "server.js"]
