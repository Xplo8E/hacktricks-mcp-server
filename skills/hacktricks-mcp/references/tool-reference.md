# MCP Tool Reference

Complete parameter reference for all 7 tools exposed by the HackTricks MCP server.

## `hacktricks_quick_lookup`

⚡ One-shot exploitation lookup. Searches, finds the best page, and returns exploitation sections + code blocks in a single call.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `topic` | string | **Yes** | Attack/technique to look up (e.g., `"SUID"`, `"sqli"`, `"docker escape"`) |
| `category` | string | No | Category filter for faster results (e.g., `pentesting-web`, `linux-hardening`) |

**Benefits:** Reduces 3+ tool calls to 1 for "how do I exploit X" questions.

---

## `search_hacktricks`

Search through HackTricks documentation. Returns results **grouped by file** with match count, page title, and relevant section headers.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | **Yes** | Search term or regex pattern |
| `category` | string | No | Filter to specific category (e.g., `pentesting-web`) |
| `limit` | number | No | Max grouped results (default: 20) |

**Example output:**
```
Found matches in 5 files for: "SUID"

📄 Linux Privilege Escalation
   Path: src/linux-hardening/privilege-escalation/README.md
   Matches: 12
   Sections: SUID Binaries | Finding SUID | GTFOBins
   Preview:
     L45: Find files with SUID bit set...
     L78: Common SUID exploitation techniques...
```

---

## `get_hacktricks_outline`

Get the **table of contents** of a page (all section headers). Use this BEFORE reading full pages to understand structure.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | **Yes** | Relative path to markdown file |

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

## `get_hacktricks_section`

Extract a **specific section** from a page by header name. Much more efficient than reading the full page.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | **Yes** | Relative path to markdown file |
| `section` | string | **Yes** | Section header to extract (partial match, case-insensitive) |

**Example:**
```json
{ "path": "src/linux-hardening/privilege-escalation/README.md", "section": "SUID" }
```

**Benefits:** Read just the "SUID Binaries" section (~200 tokens) instead of the entire page (~3000 tokens).

---

## `get_hacktricks_cheatsheet`

Extract **only code blocks** from a page. Perfect when you just need commands, payloads, or examples.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | **Yes** | Relative path to markdown file |

**Example output:**
```bash
find / -perm -4000 2>/dev/null
```
```bash
./vulnerable_suid -p
```

**Benefits:** Skip explanatory text when you just need "give me the command".

---

## `get_hacktricks_page`

Get **full content** of a HackTricks page.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | **Yes** | Relative path to markdown file |

> ⚠️ **Warning:** Pages can be very long (3000+ tokens). Consider using `get_hacktricks_outline` + `get_hacktricks_section` instead.

---

## `list_hacktricks_categories`

List categories and their contents.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Category to expand |

**Without category:** Lists top-level categories.
**With category:** Shows full directory tree with file paths.
