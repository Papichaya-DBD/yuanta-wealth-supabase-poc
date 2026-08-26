// Drives the Supabase MCP server directly over stdio (JSON-RPC), bypassing
// whatever tool a chat client would normally expose. Useful for schema/data
// work against the sandbox project without needing MCP tool auto-discovery.
//
// Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node mcp_call.mjs <toolName> '<argsJson>'
import { spawn } from 'child_process';

const PROJECT_REF = 'kqgdvpqygepvaifzrxki';

const [, , toolName, argsJson] = process.argv;
if (!toolName || !process.env.SUPABASE_ACCESS_TOKEN) {
  console.error('Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node mcp_call.mjs <toolName> <argsJsonString>');
  process.exit(1);
}
const args = argsJson ? JSON.parse(argsJson) : {};

const child = spawn('npx', ['-y', '@supabase/mcp-server-supabase@latest', `--project-ref=${PROJECT_REF}`], {
  env: process.env,
  stdio: ['pipe', 'pipe', 'pipe']
});

let buf = '';
let done = false;
child.stdout.on('data', (d) => {
  buf += d.toString();
  let lines = buf.split('\n');
  buf = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id === 3) {
        console.log(JSON.stringify(msg.result || msg.error, null, 2));
        done = true;
        child.kill();
        process.exit(0);
      }
    } catch (e) {}
  }
});
child.stderr.on('data', () => {});

function send(obj) {
  child.stdin.write(JSON.stringify(obj) + '\n');
}

setTimeout(() => {
  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'poc-cli', version: '1.0' } } });
}, 300);

setTimeout(() => {
  send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: toolName, arguments: args } });
}, 1000);

setTimeout(() => {
  if (!done) {
    console.error('TIMEOUT waiting for response');
    child.kill();
    process.exit(1);
  }
}, 20000);
