---
name: hacktricks-mcp
description: >
  Query the HackTricks pentesting knowledge base via MCP server.
  Use when the user asks for exploitation techniques, privilege escalation,
  payloads, cheatsheets, web/cloud/AD pentesting, or "how do I exploit X?"
  Do NOT use for general programming, writing original exploits from scratch,
  or legal/policy questions.
compatibility: Node.js 18+, ripgrep (rg), hacktricks-mcp-server npm package.
---

# HackTricks MCP

Query the [HackTricks](https://book.hacktricks.xyz/) pentesting knowledge base directly from your agent via the Model Context Protocol (MCP).

## When to Use This Skill

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

## What is the HackTricks MCP Server?

The HackTricks MCP Server is a Model Context Protocol server that provides 7 specialized tools for searching and querying the HackTricks pentesting documentation. It uses ripgrep for instant local search across the entire HackTricks knowledge base (~2GB of content).

**Key capabilities:**
- One-shot exploitation lookup with alias support (`sqli`, `xss`, `ssrf`, etc.)
- Full-text search with results grouped by file
- Token-efficient section extraction — read only what you need
- Cheatsheet mode — extract only code blocks/commands
- Category browsing — discover what topics exist

## Setting Up the MCP Server

### Step 1: Install the Server

```bash
npm install -g hacktricks-mcp-server
```

The postinstall script clones the HackTricks repo automatically (~2 min on first install).

### Step 2: Configure Your Agent

Add to your agent's MCP configuration (e.g., `~/.claude/settings.json`):

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
npm install && npm run build
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

### Step 3: Verify

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

### Quick-Lookup Aliases

These shorthand aliases work with `hacktricks_quick_lookup`:

| Alias | Full Topic | Typical Category |
|-------|-----------|------------------|
| `sqli` | SQL Injection | `pentesting-web` |
| `xss` | Cross-Site Scripting | `pentesting-web` |
| `rce` | Remote Code Execution | `pentesting-web` |
| `lfi` | Local File Inclusion | `pentesting-web` |
| `rfi` | Remote File Inclusion | `pentesting-web` |
| `ssrf` | Server-Side Request Forgery | `pentesting-web` |
| `csrf` | Cross-Site Request Forgery | `pentesting-web` |
| `xxe` | XML External Entity | `pentesting-web` |
| `ssti` | Server-Side Template Injection | `pentesting-web` |
| `idor` | Insecure Direct Object Reference | `pentesting-web` |
| `jwt` | JSON Web Token attacks | `pentesting-web` |
| `suid` | SUID privilege escalation | `linux-hardening` |
| `privesc` | Privilege escalation (general) | `linux-hardening` / `windows-hardening` |

## How to Query HackTricks

### Pattern 1: Quick Lookup (1 Call)

**Best for:** Known vulnerability names, common techniques.

**User:** *"How do I exploit SUID binaries for privilege escalation?"*

```
→ hacktricks_quick_lookup(topic="SUID", category="linux-hardening")
```

**Result:** Returns the best page's exploitation sections + code blocks in one shot.

---

### Pattern 2: Search → Outline → Section (3 Calls)

**Best for:** Exploratory queries where you need to find the right page first.

**User:** *"Show me SSRF techniques"*

1. `search_hacktricks(query="SSRF", category="pentesting-web", limit=10)`
2. `get_hacktricks_outline(path="src/pentesting-web/ssrf-server-side-request-forgery/README.md")`
3. `get_hacktricks_section(path="src/pentesting-web/ssrf-server-side-request-forgery/README.md", section="SSRF in PDF")`

**Token savings:** ~5500 tokens → ~400 tokens.

---

### Pattern 3: Cheatsheet Mode (2 Calls)

**Best for:** "Give me the commands" — no prose needed.

**User:** *"Give me all the reverse shell one-liners from HackTricks"*

1. `search_hacktricks(query="reverse shell")` → identifies the page path
2. `get_hacktricks_cheatsheet(path="src/generic-methodologies-and-resources/shells/README.md")`

**Result:** Only code blocks — no explanatory text.

---

### Pattern 4: Category Discovery (1 Call)

**Best for:** "What topics does HackTricks cover?"

**User:** *"What cloud security topics are there?"*

```
→ list_hacktricks_categories(category="pentesting-cloud")
```

**Result:** Full directory tree under the requested category.

---

### Pattern 5: Full Page Read (1 Call)

**Best for:** User explicitly asks for the complete page.

**User:** *"Read me the entire Linux privilege escalation page"*

```
→ get_hacktricks_page(path="src/linux-hardening/privilege-escalation/README.md")
```

> ⚠️ Pages can exceed 3000 tokens. Prefer Pattern 2 for targeted questions.

## Tips for Effective Queries

1. **Prefer `quick_lookup` for known topics** — It bundles search + section extraction + cheatsheet into one call.
2. **Always filter by category** when possible (`pentesting-web`, `linux-hardening`, `pentesting-cloud`, etc.) for faster, more relevant results.
3. **Use `outline` before `page`** — Avoid loading 3000+ tokens when you only need one section.
4. **Use `cheatsheet` for commands** — Skip prose when the user just wants copy-paste payloads.
5. **Chain tools intelligently** — Search → Outline → Section is the most token-efficient path for exploratory queries.
6. **Broaden keywords if no results** — Try removing the `category` filter or using a more general search term.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "MCP server not found" | Verify `npx hacktricks-mcp-server` runs in your terminal. Check Node.js ≥ 18. |
| "ripgrep not found" | Install `rg` (`brew install ripgrep` / `apt install ripgrep`). |
| Empty search results | Try broader keywords or remove the `category` filter. |
| Section not found | Use `get_hacktricks_outline` first to confirm the exact header spelling. |
| Outdated content | Run `git submodule update --init --recursive` in the server directory to refresh the HackTricks repo. |
| Slow first query | First install clones ~2GB of HackTricks content. Subsequent queries are instant via ripgrep. |
| Permission denied | Ensure the path in your MCP config points to the correct `dist/index.js` for source installs. |
