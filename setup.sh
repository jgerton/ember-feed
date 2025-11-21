#!/bin/bash
# Quick setup script for my-dashboard

set -e  # Exit on error

echo "🚀 Setting up Personal Dashboard..."
echo ""

# Check if Docker is installed
if command -v docker &> /dev/null; then
    DOCKER_AVAILABLE=true
    echo "✅ Docker detected"
else
    DOCKER_AVAILABLE=false
    echo "⚠️  Docker not detected (will use local setup)"
fi

# Check if Node.js is installed
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js detected ($NODE_VERSION)"
    NODE_AVAILABLE=true
else
    NODE_AVAILABLE=false
    echo "⚠️  Node.js not detected"
fi

echo ""

# Ask user which method to use
if [ "$DOCKER_AVAILABLE" = true ] && [ "$NODE_AVAILABLE" = true ]; then
    echo "Choose setup method:"
    echo "1) Docker (recommended for consistency)"
    echo "2) Local (faster hot reload)"
    read -p "Enter choice (1 or 2): " CHOICE
    echo ""
elif [ "$DOCKER_AVAILABLE" = true ]; then
    CHOICE=1
    echo "Using Docker (Node.js not installed)"
elif [ "$NODE_AVAILABLE" = true ]; then
    CHOICE=2
    echo "Using local setup (Docker not installed)"
else
    echo "❌ Error: Neither Docker nor Node.js is installed!"
    echo "Please install one of:"
    echo "  - Docker Desktop: https://www.docker.com/products/docker-desktop"
    echo "  - Node.js 18+: https://nodejs.org/"
    exit 1
fi

# Setup environment file
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from template..."
    cp .env.example .env.local
    echo "✅ Created .env.local (edit this file to add your API keys)"
    echo ""
fi

# Run setup based on choice
if [ "$CHOICE" = "1" ]; then
    echo "🐳 Setting up with Docker..."
    echo ""

    # Check if docker-compose is available
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        echo "❌ Error: docker-compose not found!"
        exit 1
    fi

    echo "Building Docker image (this may take a few minutes)..."
    $COMPOSE_CMD build

    echo ""
    echo "Starting containers..."
    $COMPOSE_CMD up -d

    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "📱 Dashboard running at: http://localhost:3000"
    echo ""
    echo "Useful commands:"
    echo "  $COMPOSE_CMD logs -f app    # View logs"
    echo "  $COMPOSE_CMD restart        # Restart"
    echo "  $COMPOSE_CMD down           # Stop"

else
    echo "💻 Setting up locally..."
    echo ""

    echo "Installing dependencies..."
    npm install

    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "Start development server:"
    echo "  npm run dev"
    echo ""
    echo "Then open: http://localhost:3000"
fi

echo ""
echo "📖 Read README.md for more information"
echo "🐳 Read DOCKER_GUIDE.md for Docker details"
echo ""
echo "Happy coding! 🎉"
