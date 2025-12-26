# HackTricks MCP Server

MCP (Model Context Protocol) server for searching and querying [HackTricks](https://github.com/carlospolop/hacktricks) pentesting documentation directly from Claude.

## Features

- **Quick lookup** - One-shot exploitation info with alias support (sqli, xss, ssrf, etc.)
- **Grouped search results** - Results aggregated by file with match count, title, and relevant sections
- **Page outline** - Quick table of contents to identify relevant sections
- **Section extraction** - Read specific sections instead of full pages (token-efficient)
- **Cheatsheet mode** - Extract only code blocks/commands from pages
- **Category browsing** - Discover available topics and file paths
- **Fast grep search** - Uses ripgrep for instant results
- **Security hardened** - Protection against command injection and path traversal

## Setup

### 1. Clone and Initialize

```bash
git clone https://github.com/Xplo8E/hacktricks-mcp.git
cd hacktricks-mcp
git submodule update --init --recursive
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Build

```bash
bun run build
```

### 4. Configure Claude

Add to your Claude settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "hacktricks": {
      "command": "node",
      "args": ["/path/to/hacktricks-mcp/dist/index.js"],
      "disabled": false
    }
  }
}
```

### 5. Restart Claude

After adding the MCP server configuration, restart Claude for the changes to take effect.

## Available Tools

### `hacktricks_quick_lookup`

⚡ **One-shot exploitation lookup**. Searches, finds best page, and returns exploitation sections + code blocks in one call.

**Parameters:**
- `topic` (string, required): Attack/technique to look up (e.g., 'SUID', 'sqli', 'xss', 'docker escape')
- `category` (string, optional): Category filter for faster results

**Supported aliases:** `sqli`, `xss`, `rce`, `lfi`, `rfi`, `ssrf`, `csrf`, `xxe`, `ssti`, `idor`, `jwt`, `suid`, `privesc`

**Example:**
```
hacktricks_quick_lookup("SSRF", category="pentesting-web")
```

**Benefits:** Reduces 3+ tool calls to 1 for "how do I exploit X" questions.

---

### `search_hacktricks`

Search through HackTricks documentation. **Returns results GROUPED BY FILE** with match count, page title, and relevant section headers.

**Parameters:**
- `query` (string, required): Search term or regex pattern
- `category` (string, optional): Filter to specific category (e.g., 'pentesting-web')
- `limit` (number, optional): Max grouped results (default: 20)

**Example output:**
```
Found matches in 5 files for: "SUID"

────────────────────────────────────────────────────────────

📄 **Linux Privilege Escalation**
   Path: src/linux-hardening/privilege-escalation/README.md
   Matches: 12
   Sections: SUID Binaries | Finding SUID | GTFOBins
   Preview:
     L45: Find files with SUID bit set...
     L78: Common SUID exploitation techniques...

────────────────────────────────────────────────────────────
```

---

### `get_hacktricks_outline`

Get the **table of contents** of a page (all section headers). Use this BEFORE reading full pages to understand structure.

**Parameters:**
- `path` (string): Relative path to markdown file

**Example output:**
```
# Linux Privilege Escalation
  ## Enumeration
    ### System Information
    ### Network
  ## SUID Binaries
    ### Finding SUID Files
    ### Exploiting SUID
  ## Capabilities
```

**Benefits:** See page structure in ~20 lines vs reading 500+ lines.

---

### `get_hacktricks_section`

Extract a **specific section** from a page by header name. Much more efficient than reading the full page.

**Parameters:**
- `path` (string): Relative path to markdown file
- `section` (string): Section header to extract (partial match, case-insensitive)

**Example:**
```
get_hacktricks_section("src/linux-hardening/privilege-escalation/README.md", "SUID")
```

**Benefits:** Read just "SUID Binaries" section (~200 tokens) instead of entire page (~3000 tokens).

---

### `get_hacktricks_cheatsheet`

Extract **only code blocks** from a page. Perfect when you just need commands, payloads, or examples.

**Parameters:**
- `path` (string): Relative path to markdown file

**Example output:**
```bash
find / -perm -4000 2>/dev/null
```

```bash
./vulnerable_suid -p
```

**Benefits:** Skip explanatory text when you just need "give me the command".

---

### `get_hacktricks_page`

Get **full content** of a HackTricks page.

**Parameters:**
- `path` (string): Relative path to markdown file

**Warning:** Pages can be very long (3000+ tokens). Consider using `get_hacktricks_outline` + `get_hacktricks_section` instead.

---

### `list_hacktricks_categories`

List categories and their contents.

**Parameters:**
- `category` (string, optional): Category to expand

**Without category:** Lists top-level categories
**With category:** Shows full directory tree with file paths

## Efficient Usage Pattern

For optimal token usage, Claude should:

1. **Search with category filter** → Get grouped results with context
2. **Get outline of relevant page** → See structure before reading
3. **Extract specific section** → Read only what's needed
4. **Get cheatsheet** → Quick command reference

**Before (inefficient):**
```
search_hacktricks("SUID")     → 50 raw lines
get_page(file1)               → 3000 tokens
get_page(file2)               → 2500 tokens  
Total: ~5500 tokens, 3 calls
```

**After (efficient):**
```
search_hacktricks("SUID", category="linux-hardening")  → Grouped results
get_outline(best_match)                                 → 20 lines
get_section(best_match, "SUID")                         → 200 tokens
Total: ~400 tokens, 3 calls
```

## Requirements

- Node.js (v18 or higher)
- ripgrep (`rg`) - usually pre-installed on macOS/Linux
- Bun (for package management)

## Development

**Watch mode:**
```bash
bun run dev
```

**Test locally:**
```bash
bun run start
```

## License

MIT

## Credits

- [HackTricks](https://github.com/carlospolop/hacktricks) by Carlos Polop
- Built with [Model Context Protocol SDK](https://github.com/modelcontextprotocol/sdk)
