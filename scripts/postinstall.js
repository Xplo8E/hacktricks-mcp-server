#!/usr/bin/env node

import { existsSync, rmSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const hacktricksPath = join(rootDir, 'hacktricks');

console.log('📦 Setting up HackTricks MCP Server...');

// Check if hacktricks directory already exists and is valid
if (existsSync(hacktricksPath)) {
  // Verify it's a valid git repo with content
  const gitDir = join(hacktricksPath, '.git');
  const srcDir = join(hacktricksPath, 'src');

  if (existsSync(gitDir) && existsSync(srcDir)) {
    console.log('✓ HackTricks repository already exists');
    process.exit(0);
  } else {
    console.log('⚠️  Incomplete HackTricks directory found, removing...');
    try {
      rmSync(hacktricksPath, { recursive: true, force: true });
    } catch (e) {
      console.error('❌ Could not remove incomplete directory');
      console.error(`   Please remove manually: ${hacktricksPath}`);
      process.exit(1);
    }
  }
}

// Check if git is installed
try {
  execSync('git --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ Git is not installed');
  console.error('   Please install git: https://git-scm.com/downloads');
  console.error('   Then run: npm rebuild hacktricks-mcp-server');
  process.exit(0); // Exit 0 to not fail npm install
}

// Check for SKIP_POSTINSTALL environment variable
if (process.env.SKIP_POSTINSTALL === 'true') {
  console.log('ℹ️  Skipping HackTricks clone (SKIP_POSTINSTALL=true)');
  console.log('   Run manually: git clone https://github.com/carlospolop/hacktricks.git');
  process.exit(0);
}

console.log('📥 Cloning HackTricks repository (this may take a minute)...');

try {
  execSync(
    'git clone --depth 1 --single-branch https://github.com/carlospolop/hacktricks.git',
    {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120000 // 2 minute timeout
    }
  );

  // Verify clone was successful
  if (existsSync(join(hacktricksPath, 'src'))) {
    console.log('✓ HackTricks repository cloned successfully');
    console.log('✓ Setup complete! You can now use the HackTricks MCP server.');
  } else {
    throw new Error('Clone incomplete - src directory not found');
  }
} catch (error) {
  console.error('❌ Failed to clone HackTricks repository');
  console.error(`   Error: ${error.message}`);
  console.error('');
  console.error('   Please run manually:');
  console.error(`   cd ${rootDir}`);
  console.error('   git clone https://github.com/carlospolop/hacktricks.git');
  console.error('');
  console.error('   Or set SKIP_POSTINSTALL=true to skip this step');

  // Clean up partial clone
  if (existsSync(hacktricksPath)) {
    try {
      rmSync(hacktricksPath, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  process.exit(0); // Exit 0 to not fail npm install
}
