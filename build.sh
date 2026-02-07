#!/bin/bash
set -e

USAGE="Usage: ./build.sh [mac|win|linux]"
if [ -z "$1" ]; then
    echo $USAGE
    exit 1
fi

TARGET_OS=$1
echo "🚀 Building for $TARGET_OS..."

# 1. Prepare directories
RM_DIR="electron/build_resources"
rm -rf $RM_DIR
mkdir -p $RM_DIR

# 2. Build Go Binaries
echo "🔨 Compiling Go binaries..."

EXTENSION=""
if [ "$TARGET_OS" == "win" ]; then
    export GOOS=windows
    export GOARCH=amd64
    EXTENSION=".exe"
elif [ "$TARGET_OS" == "arm64" ]; then
    export GOOS=windows
    export GOARCH=arm64
    EXTENSION=".exe"
elif [ "$TARGET_OS" == "mac" ]; then
    export GOOS=darwin
    export GOARCH=amd64 # Or arm64, can make configurable
    EXTENSION=""
elif [ "$TARGET_OS" == "linux" ]; then
    export GOOS=linux
    export GOARCH=amd64
    EXTENSION=""
else
    echo "Unknown OS: $TARGET_OS"
    exit 1
fi

go build -o "$RM_DIR/deriv_trade$EXTENSION" main.go
go build -o "$RM_DIR/webserver$EXTENSION" ./cmd/webserver

echo "✅ Go compilation complete."

# 3. Copy Web Assets
echo "📂 Copying assets..."
cp -r web "$RM_DIR/web"
# Create default config if needed, or just rely on env/defaults

# 4. Prepare Electron
cd electron
# Ensure deps are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node dependencies..."
    npm install
fi

# 5. Build Electron App
echo "📦 Packaging with Electron Builder..."

if [ "$TARGET_OS" == "win" ]; then
    npm run dist -- --win --x64
elif [ "$TARGET_OS" == "arm64" ]; then
    npm run dist -- --win --arm64
elif [ "$TARGET_OS" == "mac" ]; then
    npm run dist -- --mac
elif [ "$TARGET_OS" == "linux" ]; then
    npm run dist -- --linux
fi

echo "🎉 Build complete! Check electron/dist for the output."
