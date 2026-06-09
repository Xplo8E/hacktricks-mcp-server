---
name: hacktricks-mcp
description: >
  Query the HackTricks pentesting knowledge base via MCP server.
  Use when the user asks for exploitation techniques, privilege escalation,
  payloads, cheatsheets, web/cloud/AD pentesting, or "how do I exploit X?"
  Do NOT use for general programming, writing original exploits from scratch,
  or legal/policy questions.
license: MIT
compatibility: Node.js 18+, ripgrep (rg), hacktricks-mcp-server npm package.
metadata:
  author: Xplo8E
  version: "1.0"
  source: https://github.com/Xplo8E/hacktricks-mcp-server
  tags: [pentesting, security, exploit, payload, mcp, hacktricks, offensive-security]
---

# HackTricks MCP Skill

Query the [HackTricks](https://book.hacktricks.xyz/) pentesting knowledge base directly from your agent via the Model Context Protocol (MCP).

## When to Use

Activate this skill whenever the user asks for:

- **Exploitation techniques** — SQL injection, XSS, SSRF, XXE, SSTI, IDOR, RCE, LFI/RFI, etc.
- **Privilege escalation** — Linux/Windows SUID, capabilities, kernel exploits, misconfigurations
- **Payloads & cheatsheets** — Reverse shells, one-liners, encoding tricks, bypass techniques
- **Web pentesting** — Authentication bypass, JWT attacks, file upload, deserialization
- **Cloud & container security** — AWS/GCP/Azure misconfigurations, Docker escapes, Kubernetes
- **Active Directory / network** — BloodHound, Kerberoasting, relay attacks, lateral movement
- **Specific tool usage** — How to use a tool mentioned in HackTricks (e.g., `linpeas`, `pspy`, `gobuster`)
- **"How do I exploit X?"** — Any vulnerability class or technique name

**Do NOT use** for:
- General programming questions unrelated to security
- Writing original exploit code from scratch (use this for *reference*, not generation)
- Legal/policy questions (the skill provides technical knowledge only)

## MCP Server Setup

### 1. Install the Server

```bash
npm install -g hacktricks-mcp-server
```

The postinstall script clones the HackTricks repo automatically (~2 min on first install).

### 2. Configure Your Agent

Add to your agent's MCP configuration (e.g., `~/.claude/settings.json`, `.cursor/mcp.json`, etc.):

```json
{
  "mcpServers": {
    "hacktricks": {
      "command": "npx",
      "args": ["hacktricks-mcp-server"]
    }
  }
}
```

**Source install alternative:**
```bash
git clone https://github.com/Xplo8E/hacktricks-mcp-server.git
cd hacktricks-mcp-server
git submodule update --init --recursive
npm install
npm run build
```

Then point to the built file:
```json
{
  "mcpServers": {
    "hacktricks": {
      "command": "node",
      "args": ["/absolute/path/to/hacktricks-mcp-server/dist/index.js"]
    }
  }
}
```

### 3. Verify

Restart your agent and test with: *"Search HackTricks for SQL injection"*

## Available MCP Tools

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `hacktricks_quick_lookup` | One-shot lookup by topic/alias | User asks "how do I exploit X?" — reduces 3+ calls to 1 |
| `search_hacktricks` | Full-text search with grouped results | User gives a keyword but isn't sure which page |
| `get_hacktricks_outline` | Table of contents of a page | Before reading a full page to find the right section |
| `get_hacktricks_section` | Extract a specific section | User wants only the "SUID Binaries" part of a long page |
| `get_hacktricks_cheatsheet` | Extract only code blocks/commands | User wants copy-paste commands, no prose |
| `get_hacktricks_page` | Full page content | User explicitly asks for the complete page |
| `list_hacktricks_categories` | Browse categories / directory tree | User wants to discover what topics exist |

### Supported Quick-Lookup Aliases

`sqli`, `xss`, `rce`, `lfi`, `rfi`, `ssrf`, `csrf`, `xxe`, `ssti`, `idor`, `jwt`, `suid`, `privesc`

## Usage Patterns

### Pattern 1: Quick Exploitation Lookup (Recommended)

**User:** *"How do I exploit SUID binaries for privilege escalation?"*

**Action:** Call `hacktricks_quick_lookup` with topic `"SUID"` (or `"suid"`).

**Result:** Returns the best page's exploitation sections + code blocks in one shot.

```
Tool: hacktricks_quick_lookup
Args: { "topic": "SUID", "category": "linux-hardening" }
```

---

### Pattern 2: Search → Outline → Section (Token-Efficient)

**User:** *"Show me SSRF techniques"*

**Step 1 — Search:**
```
Tool: search_hacktricks
Args: { "query": "SSRF", "category": "pentesting-web", "limit": 10 }
```

**Step 2 — Outline the best match:**
```
Tool: get_hacktricks_outline
Args: { "path": "src/pentesting-web/ssrf-server-side-request-forgery/README.md" }
```

**Step 3 — Extract the relevant section:**
```
Tool: get_hacktricks_section
Args: {
  "path": "src/pentesting-web/ssrf-server-side-request-forgery/README.md",
  "section": "SSRF in PDF"
}
```

**Token savings:** ~5500 tokens → ~400 tokens for the same info.

---

### Pattern 3: Cheatsheet Mode

**User:** *"Give me all the reverse shell one-liners from HackTricks"*

**Action:** Find the page via search, then call `get_hacktricks_cheatsheet`.

```
Tool: search_hacktricks
Args: { "query": "reverse shell" }
→ identifies: src/generic-methodologies-and-resources/shells/README.md

Tool: get_hacktricks_cheatsheet
Args: { "path": "src/generic-methodologies-and-resources/shells/README.md" }
```

**Result:** Only code blocks — no explanatory text.

---

### Pattern 4: Category Discovery

**User:** *"What cloud security topics does HackTricks cover?"*

```
Tool: list_hacktricks_categories
Args: { "category": "pentesting-cloud" }
```

Returns the full directory tree under that category.

---

### Pattern 5: Full Page Read

**User:** *"Read me the entire Linux privilege escalation page"*

```
Tool: get_hacktricks_page
Args: { "path": "src/linux-hardening/privilege-escalation/README.md" }
```

> ⚠️ Warning: Pages can exceed 3000 tokens. Prefer Pattern 2 for targeted questions.

## Best Practices

1. **Prefer `quick_lookup` for known topics** — It bundles search + section extraction + cheatsheet into one call.
2. **Always filter by category** when possible (`pentesting-web`, `linux-hardening`, `pentesting-cloud`, etc.) for faster, more relevant results.
3. **Use `outline` before `page`** — Avoid loading 3000+ tokens when you only need one section.
4. **Use `cheatsheet` for commands** — Skip prose when the user just wants copy-paste payloads.
5. **Chain tools intelligently** — Search → Outline → Section is the most token-efficient path for exploratory queries.
6. **Respect rate limits** — The server uses ripgrep locally; queries are fast but avoid rapid-fire parallel calls.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "MCP server not found" | Verify `npx hacktricks-mcp-server` runs in your terminal. Check Node.js ≥ 18. |
| "ripgrep not found" | Install `rg` (`brew install ripgrep` / `apt install ripgrep`). |
| Empty search results | Try broader keywords or remove the `category` filter. |
| Section not found | Use `get_hacktricks_outline` first to confirm the exact header spelling. |
| Outdated content | Run `git submodule update --init --recursive` in the server directory to refresh the HackTricks repo. |

## Credits

- [HackTricks](https://book.hacktricks.xyz/) by Carlos Polop
- MCP Server by [Xplo8E](https://github.com/Xplo8E/hacktricks-mcp-server)
- Built with the Model Context Protocol SDK
