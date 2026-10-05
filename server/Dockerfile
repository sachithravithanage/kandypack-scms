FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source
COPY . .

EXPOSE 5000

CMD ["node", "src/index.js"]
