import { expect, test } from 'bun:test';
import { getConfig } from './index.js';

function withEnv<T>(overrides: Record<string, string | undefined>, fn: () => T): T {
  const keys = [
    'PRODUCTIVE_API_TOKEN',
    'PRODUCTIVE_ORG_ID',
    'PRODUCTIVE_USER_ID',
    'PRODUCTIVE_API_BASE_URL',
  ];
  const snapshot = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
  try {
    return fn();
  } finally {
    for (const k of keys) {
      if (snapshot[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = snapshot[k];
      }
    }
  }
}

test('getConfig returns parsed values when required env vars are set', () => {
  withEnv(
    {
      PRODUCTIVE_API_TOKEN: 'token-abc',
      PRODUCTIVE_ORG_ID: 'org-123',
      PRODUCTIVE_USER_ID: undefined,
      PRODUCTIVE_API_BASE_URL: undefined,
    },
    () => {
      const config = getConfig();
      expect(config.PRODUCTIVE_API_TOKEN).toBe('token-abc');
      expect(config.PRODUCTIVE_ORG_ID).toBe('org-123');
      expect(config.PRODUCTIVE_USER_ID).toBeUndefined();
    }
  );
});

test('getConfig defaults PRODUCTIVE_API_BASE_URL to the Productive.io v2 URL', () => {
  withEnv(
    {
      PRODUCTIVE_API_TOKEN: 'tok',
      PRODUCTIVE_ORG_ID: 'org',
      PRODUCTIVE_API_BASE_URL: undefined,
    },
    () => {
      expect(getConfig().PRODUCTIVE_API_BASE_URL).toBe('https://api.productive.io/api/v2/');
    }
  );
});

test('getConfig honours PRODUCTIVE_API_BASE_URL override', () => {
  withEnv(
    {
      PRODUCTIVE_API_TOKEN: 'tok',
      PRODUCTIVE_ORG_ID: 'org',
      PRODUCTIVE_API_BASE_URL: 'https://example.test/api/',
    },
    () => {
      expect(getConfig().PRODUCTIVE_API_BASE_URL).toBe('https://example.test/api/');
    }
  );
});

test('getConfig includes PRODUCTIVE_USER_ID when set', () => {
  withEnv(
    {
      PRODUCTIVE_API_TOKEN: 'tok',
      PRODUCTIVE_ORG_ID: 'org',
      PRODUCTIVE_USER_ID: 'user-42',
    },
    () => {
      expect(getConfig().PRODUCTIVE_USER_ID).toBe('user-42');
    }
  );
});

test('getConfig throws when PRODUCTIVE_API_TOKEN is missing', () => {
  withEnv(
    {
      PRODUCTIVE_API_TOKEN: undefined,
      PRODUCTIVE_ORG_ID: 'org',
    },
    () => {
      expect(() => getConfig()).toThrow(/Invalid configuration/);
    }
  );
});

test('getConfig throws when PRODUCTIVE_ORG_ID is missing', () => {
  withEnv(
    {
      PRODUCTIVE_API_TOKEN: 'tok',
      PRODUCTIVE_ORG_ID: undefined,
    },
    () => {
      expect(() => getConfig()).toThrow(/Invalid configuration/);
    }
  );
});

test('getConfig rejects an invalid PRODUCTIVE_API_BASE_URL', () => {
  withEnv(
    {
      PRODUCTIVE_API_TOKEN: 'tok',
      PRODUCTIVE_ORG_ID: 'org',
      PRODUCTIVE_API_BASE_URL: 'not-a-url',
    },
    () => {
      expect(() => getConfig()).toThrow(/Invalid configuration/);
    }
  );
});
