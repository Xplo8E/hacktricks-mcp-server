# Changelog

## [1.3.0] - 2025-12-26

### Tools

| Tool | Description |
|------|-------------|
| `search_hacktricks` | Search with results grouped by file, showing title, match count, and relevant sections |
| `get_hacktricks_page` | Get full page content |
| `get_hacktricks_outline` | Get table of contents (section headers) |
| `get_hacktricks_section` | Extract specific section by name |
| `get_hacktricks_cheatsheet` | Extract only code blocks/payloads |
| `list_hacktricks_categories` | Browse categories and file structure |
| `hacktricks_quick_lookup` | ⚡ One-shot exploitation lookup with alias support |

### Features

- **Grouped search results** - Results aggregated by file with title, match count, sections, and top matches
- **Section extraction** - Read specific sections (~200 tokens) instead of full pages (~3000 tokens)
- **Quick lookup** - One-shot "how do I exploit X" answers with alias expansion (sqli, xss, rce, etc.)
- **Smart tool descriptions** - Guide Claude toward efficient usage patterns
- **Category filtering** - Narrow searches to specific categories
- **Code block extraction** - Get just the commands/payloads

### Security

- Command injection protection via `execFile()`
- Path traversal prevention
- Input validation on all parameters
