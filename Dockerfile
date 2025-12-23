FROM node:18-slim

# Install dependencies needed for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Cloud Run käyttää PORT ympäristömuuttujaa (yleensä 8080)
EXPOSE 8080

# Health check ES modules -yhteensopivalla tavalla
# Cloud Run käyttää PORT ympäristömuuttujaa
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node --input-type=module -e "import('http').then(m => m.default.get('http://localhost:' + (process.env.PORT || 8080) + '/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1)))"

# Start application
CMD ["node", "src/app.js"]

