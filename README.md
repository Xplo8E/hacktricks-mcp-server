# HackTricks MCP Server

MCP (Model Context Protocol) server for searching and querying [HackTricks](https://github.com/carlospolop/hacktricks) pentesting documentation directly from Claude Code.

## Features

- **Fast grep-style search** through all HackTricks markdown files
- **Get full page content** by file path
- **Case-insensitive search** with regex support
- **Zero preprocessing** - searches run instantly on the fly

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

### 4. Configure Claude Code

Add to your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "hacktricks": {
      "command": "node",
      "args": ["/Users/vinay/projects/hacktricks-mcp/dist/index.js"],
      "disabled": false
    }
  }
}
```

**Note:** Update the path to match your actual installation directory.

### 5. Restart Claude Code

After adding the MCP server configuration, restart Claude Code for the changes to take effect.

## Usage

Once configured, Claude Code can search HackTricks during your pentesting sessions:

**Search for techniques:**
```
Me: "Need SUID privilege escalation techniques"
Claude: *searches HackTricks* "Here are the SUID exploitation methods..."
```

**Get specific page:**
```
Me: "Show me the Linux capabilities privesc page"
Claude: *retrieves full page content*
```

## Available Tools

### `search_hacktricks`
Search through HackTricks documentation for pentesting techniques, exploits, and security information.

**Parameters:**
- `query` (string): Search term or regex pattern

**Example:**
```
search_hacktricks("SUID privilege escalation")
search_hacktricks("XXE attack")
search_hacktricks("docker escape")
```

### `get_hacktricks_page`
Retrieve the full content of a specific HackTricks page.

**Parameters:**
- `path` (string): Relative path to markdown file

**Example:**
```
get_hacktricks_page("linux-hardening/privilege-escalation/README.md")
```

## How It Works

- Uses **ripgrep (rg)** for blazing-fast text search
- Searches only markdown files in the HackTricks submodule
- Returns up to 50 results per query
- No indexing or preprocessing required

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
