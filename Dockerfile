# Development Dockerfile
# Based on Node.js 18 LTS Alpine (minimal, fast)
FROM node:25-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (better caching)
# This layer only rebuilds when package.json changes
COPY package*.json ./
RUN npm install

# Copy the rest of the application
# In dev, this will be overridden by volume mount
COPY . .

# Expose Next.js default port
EXPOSE 3000

# Start development server with hot reload
CMD ["npm", "run", "dev"]
