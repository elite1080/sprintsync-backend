#!/bin/bash

echo "🚀 SprintSync Backend Deployment Script"
echo "========================================"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create one from env.example"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p data logs

# Initialize database
echo "🗄️  Initializing database..."
npm run migrate
npm run seed

# Build Docker image
echo "🐳 Building Docker image..."
docker build -t sprintsync-backend .

# Run container
echo "🚀 Starting SprintSync backend..."
docker run -d \
    --name sprintsync-backend \
    -p 3000:3000 \
    --env-file .env \
    -v $(pwd)/data:/app/data \
    -v $(pwd)/logs:/app/logs \
    sprintsync-backend

echo "✅ Deployment complete!"
echo "🌐 API available at: http://localhost:3000"
echo "📚 Documentation at: http://localhost:3000/api-docs"
echo "🏥 Health check at: http://localhost:3000/health"
echo ""
echo "📋 Sample users:"
echo "   Admin: admin / admin123"
echo "   User: john_engineer / user123"
echo "   User: sarah_dev / user123"
echo ""
echo "🔍 View logs: docker logs sprintsync-backend"
echo "🛑 Stop service: docker stop sprintsync-backend"
