# Troubleshooting

Common issues and their fixes when using the HackTricks MCP server.

| Issue | Cause | Fix |
|-------|-------|-----|
| "MCP server not found" | Server binary not in PATH or Node.js < 18 | Verify `npx hacktricks-mcp-server` runs in your terminal. Upgrade Node.js to ≥ 18. |
| "ripgrep not found" | `rg` binary missing | Install ripgrep: `brew install ripgrep` (macOS) or `apt install ripgrep` (Debian/Ubuntu). |
| Empty search results | Query too narrow or wrong category | Try broader keywords or remove the `category` filter. |
| Section not found | Header name mismatch | Use `get_hacktricks_outline` first to confirm the exact header spelling. |
| Outdated content | HackTricks repo stale | Run `git submodule update --init --recursive` in the server directory to refresh. |
| Slow first query | Initial repo clone | First install clones ~2GB of HackTricks content. Subsequent queries are instant via ripgrep. |
| Permission denied | MCP config path issue | Ensure the path in your MCP config points to the correct `dist/index.js` for source installs. |
