#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execFile } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFile, readdir } from "fs/promises";

const execFileAsync = promisify(execFile);

// Get the directory where this script is running
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const HACKTRICKS_PATH = join(__dirname, "..", "hacktricks");

// ============================================================================
// INTERFACES
// ============================================================================

interface SearchResult {
  file: string;
  line: number;
  content: string;
}

interface GroupedSearchResult {
  file: string;
  title: string;
  matchCount: number;
  relevantSections: string[];
  topMatches: {
    line: number;
    content: string;
  }[];
}

interface CategoryTree {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: CategoryTree[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract title (first H1) from markdown content
 */
function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled";
}

/**
 * Extract all section headers from markdown content
 */
function extractHeaders(content: string): { level: number; text: string; line: number }[] {
  const headers: { level: number; text: string; line: number }[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headers.push({
        level: match[1].length,
        text: match[2].trim(),
        line: i + 1,
      });
    }
  }

  return headers;
}

/**
 * Find section headers near a given line number
 */
function findNearestSection(headers: { level: number; text: string; line: number }[], targetLine: number): string | null {
  let nearestHeader: { level: number; text: string; line: number } | null = null;

  for (const header of headers) {
    if (header.line <= targetLine) {
      nearestHeader = header;
    } else {
      break;
    }
  }

  return nearestHeader ? nearestHeader.text : null;
}

/**
 * Extract a specific section from markdown content
 */
function extractSection(content: string, sectionName: string): string | null {
  const lines = content.split("\n");
  const searchLower = sectionName.toLowerCase();

  let startLine = -1;
  let startLevel = 0;

  // Find the section header
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)$/);
    if (match && match[2].toLowerCase().includes(searchLower)) {
      startLine = i;
      startLevel = match[1].length;
      break;
    }
  }

  if (startLine === -1) return null;

  // Find the end of the section (next header of same or higher level)
  let endLine = lines.length;
  for (let i = startLine + 1; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+/);
    if (match && match[1].length <= startLevel) {
      endLine = i;
      break;
    }
  }

  return lines.slice(startLine, endLine).join("\n");
}

/**
 * Extract all code blocks from markdown content
 */
function extractCodeBlocks(content: string): { language: string; code: string }[] {
  const blocks: { language: string; code: string }[] = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;

  let match;
  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || "text",
      code: match[2].trim(),
    });
  }

  return blocks;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

async function searchHackTricks(
  query: string,
  category?: string,
  limit: number = 50
): Promise<SearchResult[]> {
  try {
    if (!query || query.trim().length === 0) {
      throw new Error("Search query cannot be empty");
    }

    const searchPath = category
      ? join(HACKTRICKS_PATH, "src", category)
      : HACKTRICKS_PATH;

    console.error(
      `[HackTricks MCP] Searching for: "${query}"${category ? ` in category: ${category}` : ""}`
    );

    const { stdout } = await execFileAsync(
      "rg",
      ["-n", "-i", "--type", "md", query, searchPath],
      { maxBuffer: 1024 * 1024 * 10 }
    );

    const results: SearchResult[] = [];
    const lines = stdout.trim().split("\n");

    for (const line of lines) {
      const match = line.match(/^([^:]+):(\d+):(.+)$/);
      if (match) {
        const [, file, lineNum, content] = match;
        results.push({
          file: file.replace(HACKTRICKS_PATH + "/", ""),
          line: parseInt(lineNum, 10),
          content: content.trim(),
        });
      }
    }

    const limitedResults = results.slice(0, limit);
    console.error(`[HackTricks MCP] Found ${results.length} results (showing ${limitedResults.length})`);
    return limitedResults;
  } catch (error: any) {
    if (error.code === 1) {
      console.error(`[HackTricks MCP] No results found for: "${query}"`);
      return [];
    }
    if (error.code === 2) {
      console.error(`[HackTricks MCP] Invalid search pattern: ${error.message}`);
      throw new Error(`Invalid search pattern: ${error.message}`);
    }
    console.error(`[HackTricks MCP] Search failed: ${error.message}`);
    throw new Error(`Search failed: ${error.message}`);
  }
}

/**
 * Group search results by file with context
 */
async function searchHackTricksGrouped(
  query: string,
  category?: string,
  limit: number = 50
): Promise<GroupedSearchResult[]> {
  const rawResults = await searchHackTricks(query, category, limit * 3); // Get more raw results for better grouping

  // Group by file
  const fileGroups = new Map<string, SearchResult[]>();
  for (const result of rawResults) {
    const existing = fileGroups.get(result.file) || [];
    existing.push(result);
    fileGroups.set(result.file, existing);
  }

  // Process each file group
  const groupedResults: GroupedSearchResult[] = [];

  for (const [file, matches] of fileGroups) {
    try {
      const filePath = join(HACKTRICKS_PATH, file);
      const content = await readFile(filePath, "utf-8");
      const headers = extractHeaders(content);
      const title = extractTitle(content);

      // Find unique sections that contain matches
      const sections = new Set<string>();
      for (const match of matches) {
        const section = findNearestSection(headers, match.line);
        if (section) sections.add(section);
      }

      groupedResults.push({
        file,
        title,
        matchCount: matches.length,
        relevantSections: Array.from(sections).slice(0, 5),
        topMatches: matches.slice(0, 3).map((m) => ({
          line: m.line,
          content: m.content.length > 150 ? m.content.slice(0, 150) + "..." : m.content,
        })),
      });
    } catch {
      // If file reading fails, still include basic info
      groupedResults.push({
        file,
        title: file.split("/").pop()?.replace(".md", "") || "Unknown",
        matchCount: matches.length,
        relevantSections: [],
        topMatches: matches.slice(0, 3).map((m) => ({
          line: m.line,
          content: m.content.length > 150 ? m.content.slice(0, 150) + "..." : m.content,
        })),
      });
    }
  }

  // Sort by match count (most relevant first)
  groupedResults.sort((a, b) => b.matchCount - a.matchCount);

  return groupedResults.slice(0, limit);
}

async function getPage(path: string): Promise<string> {
  try {
    if (!path || path.trim().length === 0) {
      throw new Error("File path cannot be empty");
    }

    const normalizedPath = path.replace(/\\/g, "/");
    if (normalizedPath.includes("..") || normalizedPath.startsWith("/")) {
      throw new Error("Invalid file path: directory traversal not allowed");
    }

    const filePath = join(HACKTRICKS_PATH, normalizedPath);

    if (!filePath.startsWith(HACKTRICKS_PATH)) {
      throw new Error("Invalid file path: must be within HackTricks directory");
    }

    console.error(`[HackTricks MCP] Reading file: ${normalizedPath}`);
    const content = await readFile(filePath, "utf-8");
    console.error(`[HackTricks MCP] File size: ${content.length} bytes`);
    return content;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.error(`[HackTricks MCP] File not found: ${path}`);
      throw new Error(`File not found: ${path}`);
    }
    if (error.code === "EISDIR") {
      console.error(`[HackTricks MCP] Path is a directory: ${path}`);
      throw new Error(`Path is a directory, not a file: ${path}`);
    }
    console.error(`[HackTricks MCP] Error reading file: ${error.message}`);
    throw error;
  }
}

async function getPageOutline(path: string): Promise<string> {
  const content = await getPage(path);
  const headers = extractHeaders(content);

  if (headers.length === 0) {
    return "No headers found in this file.";
  }

  // Format headers with indentation based on level
  return headers
    .map((h) => {
      const indent = "  ".repeat(h.level - 1);
      return `${indent}${"#".repeat(h.level)} ${h.text}`;
    })
    .join("\n");
}

async function getPageSection(path: string, sectionName: string): Promise<string> {
  const content = await getPage(path);
  const section = extractSection(content, sectionName);

  if (!section) {
    throw new Error(`Section "${sectionName}" not found in ${path}`);
  }

  return section;
}

async function getPageCheatsheet(path: string): Promise<string> {
  const content = await getPage(path);
  const blocks = extractCodeBlocks(content);

  if (blocks.length === 0) {
    return "No code blocks found in this file.";
  }

  return blocks
    .map((b) => `\`\`\`${b.language}\n${b.code}\n\`\`\``)
    .join("\n\n");
}

async function listDirectoryTree(
  dirPath: string,
  basePath: string = HACKTRICKS_PATH,
  depth: number = 0,
  maxDepth: number = 3
): Promise<CategoryTree[]> {
  if (depth > maxDepth) return [];

  const entries = await readdir(dirPath, { withFileTypes: true });
  const tree: CategoryTree[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "images") continue;

    const fullPath = join(dirPath, entry.name);
    const relativePath = fullPath.replace(basePath + "/", "");

    if (entry.isDirectory()) {
      const children = await listDirectoryTree(
        fullPath,
        basePath,
        depth + 1,
        maxDepth
      );
      tree.push({
        name: entry.name,
        path: relativePath,
        type: "directory",
        children: children.length > 0 ? children : undefined,
      });
    } else if (entry.name.endsWith(".md")) {
      tree.push({
        name: entry.name,
        path: relativePath,
        type: "file",
      });
    }
  }

  return tree.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

async function listCategories(category?: string): Promise<string[] | CategoryTree[]> {
  try {
    const srcPath = join(HACKTRICKS_PATH, "src");

    if (category) {
      console.error(`[HackTricks MCP] Listing contents of category: ${category}`);
      const categoryPath = join(srcPath, category);
      const tree = await listDirectoryTree(categoryPath, HACKTRICKS_PATH);
      console.error(`[HackTricks MCP] Found ${tree.length} items in ${category}`);
      return tree;
    } else {
      console.error(`[HackTricks MCP] Listing categories in ${srcPath}`);
      const entries = await readdir(srcPath, { withFileTypes: true });

      const categories = entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "images")
        .map((entry) => entry.name)
        .sort();

      console.error(`[HackTricks MCP] Found ${categories.length} categories`);
      return categories;
    }
  } catch (error: any) {
    console.error(`[HackTricks MCP] Error listing categories: ${error.message}`);
    throw new Error(`Failed to list categories: ${error.message}`);
  }
}

// Common abbreviation aliases for better search matching
const SEARCH_ALIASES: Record<string, string[]> = {
  "sqli": ["SQL injection", "SQLi"],
  "xss": ["Cross-site scripting", "XSS"],
  "rce": ["Remote code execution", "RCE", "command injection"],
  "lfi": ["Local file inclusion", "LFI"],
  "rfi": ["Remote file inclusion", "RFI"],
  "ssrf": ["Server-side request forgery", "SSRF"],
  "csrf": ["Cross-site request forgery", "CSRF"],
  "xxe": ["XML external entity", "XXE"],
  "ssti": ["Server-side template injection", "SSTI"],
  "idor": ["Insecure direct object reference", "IDOR"],
  "jwt": ["JSON Web Token", "JWT"],
  "suid": ["SUID", "setuid"],
  "privesc": ["privilege escalation", "privesc"],
  "deserialization": ["deserialization", "insecure deserialization"],
};

// Priority sections to extract for quick lookup
const PRIORITY_SECTIONS = [
  "exploitation",
  "exploit",
  "example",
  "poc",
  "proof of concept",
  "payload",
  "bypass",
  "attack",
  "abuse",
  "technique",
];

/**
 * Quick lookup: Search + get best page + extract exploitation-relevant sections
 * One-shot answer for "how do I exploit X"
 */
async function quickLookup(
  topic: string,
  category?: string
): Promise<{ page: string; title: string; sections: string; codeBlocks: string }> {
  // Expand aliases
  const topicLower = topic.toLowerCase();
  let searchTerms = [topic];
  if (SEARCH_ALIASES[topicLower]) {
    searchTerms = [...searchTerms, ...SEARCH_ALIASES[topicLower]];
  }

  console.error(`[HackTricks MCP] Quick lookup: "${topic}" (terms: ${searchTerms.join(", ")})`);

  // Search for the topic
  let bestResult: GroupedSearchResult | null = null;
  let bestScore = 0;

  for (const term of searchTerms) {
    try {
      const results = await searchHackTricksGrouped(term, category, 10);
      if (results.length > 0) {
        for (const result of results) {
          // Score based on relevance
          let score = result.matchCount;
          const titleLower = result.title.toLowerCase();
          const termLower = term.toLowerCase();
          const pathLower = result.file.toLowerCase();

          // Strong preference for title containing search term
          if (titleLower.includes(termLower) || titleLower.includes(topicLower)) {
            score += 100;
          }

          // Prefer README files (main pages for topic folders)
          if (pathLower.endsWith("readme.md") && pathLower.includes(topicLower)) {
            score += 200; // This is likely THE main page for the topic
          }

          // Prefer folder names matching topic (e.g., ssrf-server-side-request-forgery/)
          if (pathLower.includes(`/${topicLower}`) || pathLower.includes(`${topicLower}-`)) {
            score += 50;
          }

          // Bonus for having exploitation-related sections
          const hasExploitSection = result.relevantSections.some((s) =>
            PRIORITY_SECTIONS.some((p) => s.toLowerCase().includes(p))
          );
          if (hasExploitSection) {
            score += 10;
          }

          if (score > bestScore) {
            bestScore = score;
            bestResult = result;
          }
        }
      }
    } catch {
      // Continue with other terms
    }
  }

  if (!bestResult) {
    throw new Error(`No results found for: "${topic}". Try a different term or specify a category.`);
  }

  console.error(`[HackTricks MCP] Best match: ${bestResult.file} (${bestResult.matchCount} matches)`);

  // Read the page content
  const content = await getPage(bestResult.file);
  const title = extractTitle(content);
  const headers = extractHeaders(content);

  // Extract priority sections
  const extractedSections: string[] = [];
  for (const header of headers) {
    const headerLower = header.text.toLowerCase();
    if (PRIORITY_SECTIONS.some((p) => headerLower.includes(p))) {
      try {
        const section = extractSection(content, header.text);
        if (section && section.length > 50) {
          extractedSections.push(section);
        }
      } catch {
        // Section extraction failed, skip
      }
    }
  }

  // If no priority sections found, get the first substantial section after title
  if (extractedSections.length === 0 && headers.length > 1) {
    try {
      const section = extractSection(content, headers[1].text);
      if (section) {
        extractedSections.push(section);
      }
    } catch {
      // Fallback failed
    }
  }

  // Extract code blocks
  const codeBlocks = extractCodeBlocks(content);
  const codeOutput = codeBlocks.length > 0
    ? codeBlocks.slice(0, 5).map((b) => `\`\`\`${b.language}\n${b.code}\n\`\`\``).join("\n\n")
    : "No code blocks found.";

  return {
    page: bestResult.file,
    title,
    sections: extractedSections.length > 0
      ? extractedSections.join("\n\n---\n\n")
      : "No exploitation sections found. Use get_hacktricks_page for full content.",
    codeBlocks: codeOutput,
  };
}

// ============================================================================
// MCP SERVER SETUP
// ============================================================================

const server = new Server(
  {
    name: "hacktricks-mcp",
    version: "1.3.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_hacktricks",
        description:
          "Search HackTricks for pentesting techniques, exploits, and security info. Returns results GROUPED BY FILE with: page title, match count, relevant sections, and top matches. WORKFLOW: search → get_hacktricks_outline (see structure) → get_hacktricks_section (read specific part). ALWAYS use category filter when possible - saves time and tokens.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search term. Be specific (e.g., 'SUID privilege escalation' not just 'privilege'). Supports regex.",
            },
            category: {
              type: "string",
              description: "STRONGLY RECOMMENDED. Common categories: 'pentesting-web' (XSS,SQLi,SSRF), 'linux-hardening' (privesc,capabilities), 'network-services-pentesting' (SMB,FTP,SSH), 'windows-hardening', 'mobile-pentesting', 'cloud-security'. Use list_hacktricks_categories to see all.",
            },
            limit: {
              type: "number",
              description: "Max files to return (default: 20). Lower = faster. Set to 5 for quick lookups.",
              default: 20,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_hacktricks_page",
        description:
          "Get FULL page content. ⚠️ EXPENSIVE: Pages average 3000-15000 tokens. PREFER: get_hacktricks_section for specific topics, get_hacktricks_cheatsheet for just commands. Only use this when you need the complete page or multiple sections.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path from search results (e.g., 'src/linux-hardening/privilege-escalation/README.md')",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "get_hacktricks_outline",
        description:
          "Get TABLE OF CONTENTS (all section headers) of a page. Returns ~20-50 lines showing page structure. Use this FIRST after search to: (1) verify page is relevant, (2) find exact section names for get_hacktricks_section. Cost: ~100 tokens vs 3000+ for full page.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path from search results",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "get_hacktricks_section",
        description:
          "Extract ONE SECTION from a page. MOST EFFICIENT way to read content. Typical sections: 'Exploitation', 'Enumeration', 'Prevention', 'Example', 'Payload', 'PoC', 'Bypass'. Use get_hacktricks_outline first to see exact section names. Returns ~200-500 tokens vs 3000+ for full page.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path from search results",
            },
            section: {
              type: "string",
              description: "Section name (partial match, case-insensitive). From outline or common: 'exploitation', 'enumeration', 'bypass', 'payload', 'example', 'poc', 'prevention', 'detection'",
            },
          },
          required: ["path", "section"],
        },
      },
      {
        name: "get_hacktricks_cheatsheet",
        description:
          "Extract ALL CODE BLOCKS from a page (commands, payloads, scripts, one-liners). Skips explanatory text. Perfect for: 'give me the exploit command', 'show me the payload', 'what's the syntax'. Returns code with language tags (bash, python, etc.).",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path from search results",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "list_hacktricks_categories",
        description:
          "Browse HackTricks structure. Without params: list all categories. With category: show all pages in that category. Use when: (1) unsure which category to search, (2) want to explore what's available, (3) need exact file paths.",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Category to explore. Popular: 'pentesting-web', 'linux-hardening', 'windows-hardening', 'network-services-pentesting', 'mobile-pentesting'",
            },
          },
        },
      },
      {
        name: "hacktricks_quick_lookup",
        description:
          "⚡ ONE-SHOT exploitation lookup. Searches, finds best page, and returns exploitation sections + code blocks. Use for: 'how do I exploit X', 'give me X payload', 'X attack technique'. Handles aliases (sqli→SQL injection, xss→Cross-site scripting, rce, lfi, ssrf, etc.). Returns: page title, exploitation sections, and top 5 code blocks.",
        inputSchema: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "Attack/technique to look up. Examples: 'SUID', 'sqli', 'xss', 'ssrf', 'jwt', 'docker escape', 'kerberoasting'. Aliases auto-expand.",
            },
            category: {
              type: "string",
              description: "Optional category filter. Speeds up search. Common: 'pentesting-web', 'linux-hardening', 'windows-hardening', 'network-services-pentesting'",
            },
          },
          required: ["topic"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error("Arguments are required");
  }

  if (name === "search_hacktricks") {
    const query = args.query as string;
    const category = args.category as string | undefined;
    const limit = Math.min((args.limit as number) || 20, 50);

    if (!query) {
      throw new Error("Query parameter is required");
    }

    const results = await searchHackTricksGrouped(query, category, limit);

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No results found for: "${query}"${category ? ` in category: ${category}` : ""}\n\nTip: Try broader terms or different category.`,
          },
        ],
      };
    }

    // Format grouped results
    let output = `Found matches in ${results.length} files for: "${query}"${category ? ` in category: ${category}` : ""}\n`;
    output += `\n${"─".repeat(60)}\n`;

    for (const result of results) {
      output += `\n📄 **${result.title}**\n`;
      output += `   Path: ${result.file}\n`;
      output += `   Matches: ${result.matchCount}\n`;

      if (result.relevantSections.length > 0) {
        output += `   Sections: ${result.relevantSections.join(" | ")}\n`;
      }

      output += `   Preview:\n`;
      for (const match of result.topMatches) {
        output += `     L${match.line}: ${match.content}\n`;
      }
      output += `\n${"─".repeat(60)}\n`;
    }

    output += `\n💡 Tips:\n`;
    output += `• Use get_hacktricks_outline(path) to see page structure\n`;
    output += `• Use get_hacktricks_section(path, section) to read specific sections\n`;
    output += `• Use get_hacktricks_cheatsheet(path) to get just the code/commands`;

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  }

  if (name === "get_hacktricks_page") {
    const path = args.path as string;
    if (!path) {
      throw new Error("Path parameter is required");
    }

    const content = await getPage(path);

    return {
      content: [
        {
          type: "text",
          text: content,
        },
      ],
    };
  }

  if (name === "get_hacktricks_outline") {
    const path = args.path as string;
    if (!path) {
      throw new Error("Path parameter is required");
    }

    const outline = await getPageOutline(path);

    return {
      content: [
        {
          type: "text",
          text: `Outline of ${path}:\n\n${outline}\n\n💡 Use get_hacktricks_section(path, "section name") to read a specific section.`,
        },
      ],
    };
  }

  if (name === "get_hacktricks_section") {
    const path = args.path as string;
    const section = args.section as string;

    if (!path) {
      throw new Error("Path parameter is required");
    }
    if (!section) {
      throw new Error("Section parameter is required");
    }

    const sectionContent = await getPageSection(path, section);

    return {
      content: [
        {
          type: "text",
          text: sectionContent,
        },
      ],
    };
  }

  if (name === "get_hacktricks_cheatsheet") {
    const path = args.path as string;
    if (!path) {
      throw new Error("Path parameter is required");
    }

    const cheatsheet = await getPageCheatsheet(path);

    return {
      content: [
        {
          type: "text",
          text: `Code blocks from ${path}:\n\n${cheatsheet}`,
        },
      ],
    };
  }

  if (name === "list_hacktricks_categories") {
    const category = args.category as string | undefined;
    const result = await listCategories(category);

    let output: string;
    if (category) {
      const formatTree = (items: CategoryTree[], indent = ""): string => {
        return items
          .map((item) => {
            const icon = item.type === "directory" ? "📁" : "📄";
            let line = `${indent}${icon} ${item.name}`;
            if (item.type === "file") {
              line += ` → ${item.path}`;
            }
            if (item.children && item.children.length > 0) {
              line += "\n" + formatTree(item.children, indent + "  ");
            }
            return line;
          })
          .join("\n");
      };

      output = `Contents of category: ${category}\n\n${formatTree(result as CategoryTree[])}`;
    } else {
      const categories = result as string[];
      output = `Available HackTricks Categories (${categories.length}):\n\n${categories.map((cat) => `- ${cat}`).join("\n")}\n\nTip: Use category parameter to see contents (e.g., category="pentesting-web")`;
    }

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  }

  if (name === "hacktricks_quick_lookup") {
    const topic = args.topic as string;
    const category = args.category as string | undefined;

    if (!topic) {
      throw new Error("Topic parameter is required");
    }

    const result = await quickLookup(topic, category);

    let output = `⚡ Quick Lookup: ${result.title}\n`;
    output += `📄 Page: ${result.page}\n`;
    output += `\n${"═".repeat(60)}\n`;
    output += `\n## Exploitation Info\n\n`;
    output += result.sections;
    output += `\n\n${"═".repeat(60)}\n`;
    output += `\n## Code/Payloads\n\n`;
    output += result.codeBlocks;
    output += `\n\n${"─".repeat(60)}\n`;
    output += `💡 Need more? Use get_hacktricks_page("${result.page}") for full content.`;

    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("HackTricks MCP Server v1.3.0 running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
