# Changelog

All notable changes to the HackTricks MCP Server will be documented in this file.

## [1.2.0] - 2025-12-26

### Added
- **Search filtering by category** - Narrow searches to specific categories (e.g., search XSS only in pentesting-web)
  - Found 472 XSS results, but searching in pentesting-web returns focused results
  - Saves tokens and time by avoiding irrelevant matches
- **Configurable result limits** - Control how many results to return (default: 50, max: 100)
  - Get 10 quick results instead of 50 when you know what you're looking for
- **Expanded category listing** - Show full directory tree with files and paths
  - See all subdirectories and markdown files in a category
  - Get exact file paths without guessing (e.g., see all XSS-related pages in pentesting-web)
  - Navigate structure before searching

### Changed
- `search_hacktricks` now accepts `category` and `limit` parameters
- `list_hacktricks_categories` now accepts optional `category` parameter to expand tree
- Improved output formatting with indented tree structure
- Added helpful tips in outputs (e.g., how to expand categories)

### Performance
- Category-filtered searches are faster (fewer files to scan)
- Reduced token usage with configurable limits
- Better UX - know exactly what pages exist before fetching

## [1.1.0] - 2025-12-26

### Added
- `list_hacktricks_categories` tool for discovering available topics
- Comprehensive debug logging with `[HackTricks MCP]` prefix
- Path traversal protection in `get_hacktricks_page`
- Input validation for all tool parameters
- Detailed error messages for common failure scenarios

### Security
- **CRITICAL:** Fixed command injection vulnerability in search
  - Replaced `exec()` with `execFile()` for safe command execution
  - Search queries no longer passed through shell
- Added path traversal prevention in file retrieval
- Path validation ensures files are within HackTricks directory
- Empty input validation for all parameters

### Changed
- Improved error handling with specific error codes
- Better error messages for file not found, invalid paths, etc.
- Increased result limit clarity (50 results max)
- Updated README with security improvements and new tool

### Fixed
- TypeScript compilation errors with potentially undefined args
- Proper handling of ripgrep exit codes (0, 1, 2)
- File reading now uses native `fs/promises` instead of shell commands

## [1.0.0] - 2025-12-26

### Added
- Initial release with basic MCP server functionality
- `search_hacktricks` tool for grep-style search
- `get_hacktricks_page` tool for retrieving full page content
- HackTricks repository as git submodule
- TypeScript build configuration
- Basic README with setup instructions
