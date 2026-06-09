# Quick Lookup Aliases

The `hacktricks_quick_lookup` tool supports these shorthand aliases for common attack vectors.
Pass the alias as the `topic` parameter.

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

## Usage

```json
{ "topic": "ssrf", "category": "pentesting-web" }
```

The `category` filter is optional but recommended for faster, more relevant results.
