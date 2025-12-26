# Changelog

All notable changes to the HackTricks MCP Server will be documented in this file.

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
