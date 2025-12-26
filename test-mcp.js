#!/usr/bin/env node

/**
 * Simple MCP server test script
 * Tests the server by sending MCP protocol messages
 */

import { spawn } from 'child_process';

const serverProcess = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'] // stdin, stdout, stderr
});

let responseBuffer = '';

serverProcess.stdout.on('data', (data) => {
  responseBuffer += data.toString();

  // Try to parse complete JSON messages
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || ''; // Keep incomplete line

  for (const line of lines) {
    if (line.trim()) {
      try {
        const message = JSON.parse(line);
        console.log('📨 Received:', JSON.stringify(message, null, 2));
      } catch (e) {
        console.log('📨 Raw:', line);
      }
    }
  }
});

serverProcess.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
  process.exit(code);
});

// Send test messages
function sendMessage(message) {
  console.log('📤 Sending:', JSON.stringify(message, null, 2));
  serverProcess.stdin.write(JSON.stringify(message) + '\n');
}

// Wait a bit for server to start
setTimeout(() => {
  console.log('\n=== Test 1: Initialize ===');
  sendMessage({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  });
}, 500);

setTimeout(() => {
  console.log('\n=== Test 2: List Tools ===');
  sendMessage({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  });
}, 1500);

setTimeout(() => {
  console.log('\n=== Test 3: Call search_hacktricks ===');
  sendMessage({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'search_hacktricks',
      arguments: {
        query: 'SUID'
      }
    }
  });
}, 2500);

setTimeout(() => {
  console.log('\n=== Test 4: Call list_hacktricks_categories ===');
  sendMessage({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'list_hacktricks_categories',
      arguments: {}
    }
  });
}, 3500);

setTimeout(() => {
  console.log('\n=== Test 5: Call get_hacktricks_page ===');
  sendMessage({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'get_hacktricks_page',
      arguments: {
        path: 'src/README.md'
      }
    }
  });
}, 4500);

// Exit after tests
setTimeout(() => {
  console.log('\n=== All tests complete ===');
  serverProcess.kill();
  process.exit(0);
}, 6000);
