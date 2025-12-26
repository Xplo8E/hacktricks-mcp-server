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

async function searchHackTricks(query: string): Promise<SearchResult[]> {
  try {
    // Validate query is not empty
    if (!query || query.trim().length === 0) {
      throw new Error("Search query cannot be empty");
    }

    console.error(`[HackTricks MCP] Searching for: "${query}"`);

    // Use execFile (safer than exec - no shell injection)
    const { stdout } = await execFileAsync(
      "rg",
      ["-n", "-i", "--type", "md", query, HACKTRICKS_PATH],
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

    const limitedResults = results.slice(0, 50); // Limit to 50 results
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

async function listCategories(): Promise<string[]> {
  try {
    console.error(`[HackTricks MCP] Listing categories in ${HACKTRICKS_PATH}/src`);
    const srcPath = join(HACKTRICKS_PATH, "src");
    const entries = await readdir(srcPath, { withFileTypes: true });

    const categories = entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .map((entry) => entry.name)
      .sort();

    console.error(`[HackTricks MCP] Found ${categories.length} categories`);
    return categories;
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
          "Search through HackTricks documentation for pentesting techniques, exploits, and security information. Returns matching lines from markdown files.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (supports regex patterns)",
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
          "List all available top-level categories in HackTricks documentation (useful for discovering available topics)",
        inputSchema: {
          type: "object",
          properties: {},
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
    if (!query) {
      throw new Error("Query parameter is required");
    }

    const results = await searchHackTricks(query);

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No results found for: "${query}"`,
          },
        ],
      };
    }

    // Format results as text
    let output = `Found ${results.length} matches for: "${query}"\n\n`;
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
    const categories = await listCategories();

    const output = `Available HackTricks Categories (${categories.length}):\n\n${categories.map((cat) => `- ${cat}`).join("\n")}`;

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
