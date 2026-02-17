#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseArgs() {
  const args = process.argv.slice(2);
  let model = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model' || args[i] === '-m') {
      model = args[++i];
    }
  }
  
  return { model };
}

function runLoopy(args) {
  return new Promise((resolve, reject) => {
    const binPath = join(__dirname, '..', 'bin', 'loopy');
    const child = spawn('node', [binPath, ...args], {
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code });
    });
    
    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function verify() {
  const { model } = parseArgs();
  const modelFlag = model ? ['--model', model] : [];
  const modelName = model || 'default (from config)';
  
  console.log(`Using model: ${modelName}\n`);
  
  // Test 1: Basic response
  console.log('Testing model response...');
  process.stdout.write('  Querying: "What is 2 plus 2?" ... ');
  
  try {
    const result1 = await runLoopy([...modelFlag, 'What is 2 plus 2?']);
    
    if (result1.exitCode !== 0) {
      console.log('FAILED');
      console.error(`  Error: ${result1.stderr || 'Unknown error'}`);
      process.exit(1);
    }
    
    if (result1.stdout.includes('4')) {
      console.log('OK');
      console.log('✓ Model responds correctly\n');
    } else {
      console.log('FAILED');
      console.error(`  Unexpected response: ${result1.stdout.trim()}`);
      process.exit(1);
    }
  } catch (err) {
    console.log('FAILED');
    console.error(`  Error: ${err.message}`);
    process.exit(1);
  }
  
  // Test 2: Tool calling
  console.log('Testing tool calling...');
  process.stdout.write('  Querying: "List files in /tmp" ... ');
  
  try {
    const result2 = await runLoopy(['--verbose', ...modelFlag, 'List files in /tmp']);
    
    if (result2.exitCode !== 0) {
      console.log('FAILED');
      console.error(`  Error: ${result2.stderr || 'Unknown error'}`);
      process.exit(1);
    }
    
    const toolCallsMatch = result2.stdout.match(/Tool calls:\s*(\d+)/);
    const toolCallCount = toolCallsMatch ? parseInt(toolCallsMatch[1], 10) : 0;
    
    if (toolCallCount > 0) {
      console.log('OK');
      console.log(`✓ Tool calling works (${toolCallCount} call(s))\n`);
    } else {
      console.log('FAILED');
      console.error('  Model did not use any tools');
      process.exit(1);
    }
  } catch (err) {
    console.log('FAILED');
    console.error(`  Error: ${err.message}`);
    process.exit(1);
  }
  
  console.log('All verification checks passed!');
  process.exit(0);
}

verify();
