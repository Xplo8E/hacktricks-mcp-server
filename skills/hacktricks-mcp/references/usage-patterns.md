# Usage Patterns

Token-efficient workflows for querying HackTricks via MCP.

## Pattern A: Quick Lookup (1 Call)

**Best for:** Known vulnerability names, common techniques.

```
User: "How do I exploit SUID binaries?"

→ hacktricks_quick_lookup(topic="SUID", category="linux-hardening")
```

**Result:** Exploitation sections + code blocks from the best-matching page.

---

## Pattern B: Search → Outline → Section (3 Calls)

**Best for:** Exploratory queries where you need to find the right page first.

```
User: "Show me SSRF techniques"

Step 1: search_hacktricks(query="SSRF", category="pentesting-web", limit=10)
Step 2: get_hacktricks_outline(path="src/pentesting-web/ssrf-server-side-request-forgery/README.md")
Step 3: get_hacktricks_section(
          path="src/pentesting-web/ssrf-server-side-request-forgery/README.md",
          section="SSRF in PDF"
        )
```

**Token savings:** ~5500 tokens → ~400 tokens.

---

## Pattern C: Cheatsheet Mode (2 Calls)

**Best for:** "Give me the commands" — no prose needed.

```
User: "Give me reverse shell one-liners"

Step 1: search_hacktricks(query="reverse shell")
        → identifies: src/generic-methodologies-and-resources/shells/README.md

Step 2: get_hacktricks_cheatsheet(
          path="src/generic-methodologies-and-resources/shells/README.md"
        )
```

**Result:** Only code blocks — no explanatory text.

---

## Pattern D: Category Discovery (1 Call)

**Best for:** "What topics does HackTricks cover?"

```
User: "What cloud security topics are there?"

→ list_hacktricks_categories(category="pentesting-cloud")
```

**Result:** Full directory tree under the requested category.

---

## Pattern E: Full Page Read (1 Call)

**Best for:** User explicitly asks for the complete page.

```
User: "Read me the entire Linux privilege escalation page"

→ get_hacktricks_page(path="src/linux-hardening/privilege-escalation/README.md")
```

> ⚠️ Pages can exceed 3000 tokens. Prefer Pattern B for targeted questions.
