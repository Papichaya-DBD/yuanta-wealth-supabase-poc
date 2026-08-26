// Same as mcp_call.mjs but reads a SQL query from a file instead of argv,
// for statements too large to pass safely as a command-line argument
// (e.g. apply_migration / execute_sql with a multi-KB SQL body).
//
// Usage:
//   SUPABASE_ACCESS_TOKEN=sbp_xxx node mcp_call_file.mjs execute_sql query path/to/query.sql
//   SUPABASE_ACCESS_TOKEN=sbp_xxx node mcp_call_file.mjs apply_migration migration path/to/migration.sql migration_name
import { spawn } from 'child_process';
import { readFileSync } from 'fs';

const PROJECT_REF = 'kqgdvpqygepvaifzrxki';

const [, , toolName, argName, sqlFilePath, migrationName] = process.argv;
if (!toolName || !argName || !sqlFilePath || !process.env.SUPABASE_ACCESS_TOKEN) {
  console.error('Usage: SUPABASE_ACCESS_TOKEN=sbp_xxx node mcp_call_file.mjs <toolName> <query|migration> <sqlFilePath> [migrationName]');
  process.exit(1);
}
const sql = readFileSync(sqlFilePath, 'utf-8');
const args = argName === 'migration'
  ? { name: migrationName || 'migration', query: sql }
  : { query: sql };

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
}, 30000);
