#!/bin/bash
# Quick script to start backend properly

echo "🚀 Starting CEO Dashboard Backend..."
echo ""

# Kill any existing processes
echo "1️⃣  Cleaning up old processes..."
pkill -f "nodemon" 2>/dev/null
pkill -f "node server" 2>/dev/null
lsof -ti:3002 | xargs kill -9 2>/dev/null
sleep 2

# Check if port is free
if lsof -i:3002 >/dev/null 2>&1; then
    echo "❌ Port 3002 still in use. Please run: lsof -ti:3002 | xargs kill -9"
    exit 1
fi

echo "✅ Port 3002 is free"
echo ""

# Start backend
echo "2️⃣  Starting backend server..."
cd "$(dirname "$0")"
npm run dev:backend

# Note: This will keep running until you press Ctrl+C
