#!/bin/sh
VERSION=$(git describe --tags --always --dirty 2>/dev/null || echo "unknown")
echo "export const VERSION = '$VERSION';" > src/version.gen.ts
echo "Version: $VERSION"
