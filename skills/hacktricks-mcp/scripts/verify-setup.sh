#!/usr/bin/env bash
# Verify HackTricks MCP server setup

set -e

echo "=== HackTricks MCP Setup Verification ==="

# Check Node.js version
node_version=$(node --version 2>/dev/null || echo "not found")
if [[ "$node_version" == "not found" ]]; then
    echo "❌ Node.js not found. Install Node.js ≥ 18."
    exit 1
elif [[ "${node_version#v}" < "18" ]]; then
    echo "❌ Node.js $node_version is too old. Upgrade to ≥ 18."
    exit 1
else
    echo "✅ Node.js $node_version"
fi

# Check ripgrep
if command -v rg &> /dev/null; then
    echo "✅ ripgrep $(rg --version | head -n1)"
else
    echo "❌ ripgrep (rg) not found. Install it:"
    echo "   macOS: brew install ripgrep"
    echo "   Ubuntu/Debian: sudo apt install ripgrep"
    exit 1
fi

# Check hacktricks-mcp-server
if command -v hacktricks-mcp-server &> /dev/null || npx hacktricks-mcp-server --version &> /dev/null 2>&1; then
    echo "✅ hacktricks-mcp-server is available"
else
    echo "❌ hacktricks-mcp-server not found. Install it:"
    echo "   npm install -g hacktricks-mcp-server"
    exit 1
fi

# Check HackTricks repo clone
hacktricks_dir="$(npm root -g)/hacktricks-mcp-server/hacktricks" 2>/dev/null || true
if [[ -d "$hacktricks_dir" ]]; then
    echo "✅ HackTricks repo cloned at $hacktricks_dir"
else
    echo "⚠️  HackTricks repo not found. It will be cloned on first use (~2 min)."
fi

echo ""
echo "=== All checks passed! ==="
