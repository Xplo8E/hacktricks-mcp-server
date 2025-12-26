#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const execAsync = promisify(exec);

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
    // Use ripgrep to search through markdown files
    const { stdout } = await execAsync(
      `rg -n -i --type md "${query}" "${HACKTRICKS_PATH}"`,
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

    return results.slice(0, 50); // Limit to 50 results
  } catch (error: any) {
    // rg returns exit code 1 when no matches found
    if (error.code === 1) {
      return [];
    }
    throw error;
  }
}

async function getPage(path: string): Promise<string> {
  try {
    const filePath = join(HACKTRICKS_PATH, path);
    const { stdout } = await execAsync(`cat "${filePath}"`);
    return stdout;
  } catch (error) {
    throw new Error(`Failed to read file: ${path}`);
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
                "Relative path to the markdown file (e.g., 'linux-hardening/privilege-escalation/README.md')",
            },
          },
          required: ["path"],
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
