# Development Dockerfile
# Based on Node.js 22 LTS Alpine (minimal, fast)
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (better caching)
# Only copy package.json (not package-lock.json) because lock file
# was generated on Windows and doesn't include Linux native binaries
COPY package.json ./
RUN npm install

# Copy the rest of the application
# In dev, this will be overridden by volume mount
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose Next.js default port
EXPOSE 3000

# Start development server with hot reload
CMD ["npm", "run", "dev"]
