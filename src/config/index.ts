import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { z } from 'zod';

// Resolve .env relative to this module rather than process.cwd(), so the
// server picks up the repo's .env regardless of where the MCP client
// spawns it from. `quiet: true` silences dotenv's banner — MCP stdio
// reserves stdout for JSON-RPC framing.
const moduleDir = dirname(fileURLToPath(import.meta.url));
config({ quiet: true, path: resolve(moduleDir, '../../.env') });

const configSchema = z.object({
  PRODUCTIVE_API_TOKEN: z.string().min(1, 'API token is required'),
  PRODUCTIVE_ORG_ID: z.string().min(1, 'Organization ID is required'),
  PRODUCTIVE_USER_ID: z.string().optional(),
  PRODUCTIVE_API_BASE_URL: z.string().url().default('https://api.productive.io/api/v2/'),
});

export type Config = z.infer<typeof configSchema>;

export function getConfig(): Config {
  const result = configSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('Configuration validation failed:', result.error.format());
    throw new Error('Invalid configuration. Please check your environment variables.');
  }
  
  return result.data;
}