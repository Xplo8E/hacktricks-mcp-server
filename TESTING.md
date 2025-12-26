# Testing the HackTricks MCP Server

This document describes how to test the MCP server functionality.

## Manual Testing

### Prerequisites
```bash
cd ~/projects/hacktricks-mcp
bun install
bun run build
```

### Test 1: Verify Build Output
```bash
ls -la dist/
# Should show index.js
```

### Test 2: Test Search Functionality (CLI)
```bash
# Test basic search
rg -n -i --type md "SUID" hacktricks/ | head -10

# Test regex search
rg -n -i --type md "docker.*escape" hacktricks/ | head -5

# Test no results
rg -n -i --type md "xyznotfound12345" hacktricks/
```

### Test 3: Test File Reading
```bash
# Test reading a valid file
cat hacktricks/src/linux-hardening/privilege-escalation/README.md | head -20

# Test path traversal protection (should fail)
cat hacktricks/../../../etc/passwd 2>&1
```

### Test 4: List Categories
```bash
ls hacktricks/src/ | grep -v "\.md$" | grep -v "^images$" | sort
```

## Integration Testing with Claude Code

### 1. Add to Claude Code Settings

Edit `~/.claude/settings.json`:
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

### 2. Restart Claude Code

### 3. Test Commands

Try these queries with Claude Code:

**Search Test:**
```
"Search HackTricks for SUID privilege escalation"
```

**Category List Test:**
```
"What categories are available in HackTricks?"
```

**Page Retrieval Test:**
```
"Show me the Linux privilege escalation page from HackTricks"
```

**Edge Cases:**
```
"Search HackTricks for: XXE|SSRF|CSRF"  # Regex test
"Search HackTricks for: docker.*escape"  # Regex test
```

## Expected Results

### Search Results Format
```
Found X matches for: "query"

📄 path/to/file.md:123
Content of matching line

📄 path/to/another.md:456
Another matching line
```

### Category List Format
```
Available HackTricks Categories (X):

- AI
- binary-exploitation
- crypto
- linux-hardening
...
```

### Page Content Format
```
[Full markdown content of the page]
```

## Debugging

Check MCP server logs in Claude Code console:
```
[HackTricks MCP] Searching for: "query"
[HackTricks MCP] Found X results (showing Y)
[HackTricks MCP] Reading file: path/to/file.md
[HackTricks MCP] File size: XXXX bytes
```

## Error Testing

### Test Empty Query
```
search_hacktricks("")
# Expected: "Search query cannot be empty"
```

### Test Invalid Path
```
get_hacktricks_page("../../../etc/passwd")
# Expected: "Invalid file path: directory traversal not allowed"
```

### Test Non-existent File
```
get_hacktricks_page("src/nonexistent.md")
# Expected: "File not found: src/nonexistent.md"
```

### Test Invalid Regex
```
search_hacktricks("[[invalid")
# Expected: "Invalid search pattern: ..."
```

## Performance Testing

### Large Query Results
```bash
# Search for common term
rg -n -i --type md "privilege" hacktricks/ | wc -l
# Should handle large result sets (limited to 50)
```

### File Size Limits
```bash
# Find largest markdown file
find hacktricks/src -name "*.md" -type f -exec du -h {} + | sort -rh | head -5
# Ensure server can handle large files
```

## Security Testing

### Command Injection Prevention
Test that special characters in queries don't execute commands:
```
search_hacktricks("test; ls -la")
search_hacktricks("test && whoami")
search_hacktricks("test $(whoami)")
```
All should search for the literal strings, not execute commands.

### Path Traversal Prevention
```
get_hacktricks_page("../../../etc/passwd")
get_hacktricks_page("/etc/passwd")
get_hacktricks_page("src/../../..")
```
All should be rejected with appropriate error messages.
