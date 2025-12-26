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

interface SearchResult {
  file: string;
  line: number;
  content: string;
}

async function searchHackTricks(
  query: string,
  category?: string,
  limit: number = 50
): Promise<SearchResult[]> {
  try {
    // Validate query is not empty
    if (!query || query.trim().length === 0) {
      throw new Error("Search query cannot be empty");
    }

    // Determine search path
    const searchPath = category
      ? join(HACKTRICKS_PATH, "src", category)
      : HACKTRICKS_PATH;

    console.error(
      `[HackTricks MCP] Searching for: "${query}"${category ? ` in category: ${category}` : ""}`
    );

    // Use execFile (safer than exec - no shell injection)
    const { stdout } = await execFileAsync(
      "rg",
      ["-n", "-i", "--type", "md", query, searchPath],
      { maxBuffer: 1024 * 1024 * 10 } // 10MB buffer
    );

    const results: SearchResult[] = [];
    const lines = stdout.trim().split("\n");

    for (const line of lines) {
      // Parse rg output: filename:line_number:content
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

    const limitedResults = results.slice(0, limit); // Configurable limit
    console.error(`[HackTricks MCP] Found ${results.length} results (showing ${limitedResults.length})`);
    return limitedResults;
  } catch (error: any) {
    // rg returns exit code 1 when no matches found
    if (error.code === 1) {
      console.error(`[HackTricks MCP] No results found for: "${query}"`);
      return [];
    }
    // rg returns exit code 2 for errors (invalid regex, etc.)
    if (error.code === 2) {
      console.error(`[HackTricks MCP] Invalid search pattern: ${error.message}`);
      throw new Error(`Invalid search pattern: ${error.message}`);
    }
    console.error(`[HackTricks MCP] Search failed: ${error.message}`);
    throw new Error(`Search failed: ${error.message}`);
  }
}

async function getPage(path: string): Promise<string> {
  try {
    // Validate path is not empty
    if (!path || path.trim().length === 0) {
      throw new Error("File path cannot be empty");
    }

    // Prevent directory traversal
    const normalizedPath = path.replace(/\\/g, "/");
    if (normalizedPath.includes("..") || normalizedPath.startsWith("/")) {
      throw new Error("Invalid file path: directory traversal not allowed");
    }

    const filePath = join(HACKTRICKS_PATH, normalizedPath);

    // Ensure the resolved path is still within HACKTRICKS_PATH
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

interface CategoryTree {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: CategoryTree[];
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
    // Skip hidden files and images directory
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
    // Directories first, then files
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
      // List contents of specific category
      console.error(`[HackTricks MCP] Listing contents of category: ${category}`);
      const categoryPath = join(srcPath, category);
      const tree = await listDirectoryTree(categoryPath, HACKTRICKS_PATH);
      console.error(`[HackTricks MCP] Found ${tree.length} items in ${category}`);
      return tree;
    } else {
      // List top-level categories only
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

// Create server instance
const server = new Server(
  {
    name: "hacktricks-mcp",
    version: "1.0.0",
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
          "Search through HackTricks documentation for pentesting techniques, exploits, and security information. Returns matching lines from markdown files. Can filter by category and limit results.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (supports regex patterns)",
            },
            category: {
              type: "string",
              description: "Optional: Filter search to specific category (e.g., 'pentesting-web', 'linux-hardening'). Use list_hacktricks_categories to see available categories.",
            },
            limit: {
              type: "number",
              description: "Optional: Maximum number of results to return (default: 50, max: 100)",
              default: 50,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_hacktricks_page",
        description:
          "Retrieve the full content of a specific HackTricks page by file path",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description:
                "Relative path to the markdown file (e.g., 'src/linux-hardening/privilege-escalation/README.md')",
            },
          },
          required: ["path"],
        },
      },
      {
        name: "list_hacktricks_categories",
        description:
          "List categories and their contents in HackTricks documentation. Without parameters, lists top-level categories. With category parameter, shows the full directory tree of that category including all subdirectories and files (useful for finding exact file paths).",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Optional: Specific category to expand and show full tree (e.g., 'pentesting-web' to see all XSS, SQLi, etc. pages)",
            },
          },
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
    const limit = Math.min((args.limit as number) || 50, 100); // Cap at 100

    if (!query) {
      throw new Error("Query parameter is required");
    }

    const results = await searchHackTricks(query, category, limit);

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No results found for: "${query}"${category ? ` in category: ${category}` : ""}`,
          },
        ],
      };
    }

    // Format results as text
    let output = `Found ${results.length} matches for: "${query}"${category ? ` in category: ${category}` : ""}\n\n`;
    for (const result of results) {
      output += `📄 ${result.file}:${result.line}\n${result.content}\n\n`;
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

  if (name === "list_hacktricks_categories") {
    const category = args.category as string | undefined;
    const result = await listCategories(category);

    let output: string;
    if (category) {
      // Format tree structure
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
      // Simple list of categories
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

  throw new Error(`Unknown tool: ${name}`);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("HackTricks MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
