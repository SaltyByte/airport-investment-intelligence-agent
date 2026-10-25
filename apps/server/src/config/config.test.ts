import { describe, expect, it } from 'vitest';
import { loadConfig } from './index';

describe('loadConfig', () => {
  it('returns Ok with defaults for a valid env', () => {
    const result = loadConfig({ DEEPSEEK_API_KEY: 'k' });
    expect(result._unsafeUnwrap()).toEqual({
      DEEPSEEK_API_KEY: 'k',
      DEEPSEEK_MODEL: 'deepseek-v4-flash',
      SERVER_PORT: 4100,
    });
  });

  it('returns Err naming a missing key and pointing at .env.example', () => {
    const message = loadConfig({})._unsafeUnwrapErr();
    expect(message).toContain('DEEPSEEK_API_KEY');
    expect(message).toContain('.env.example');
    expect(message).not.toContain('\n');
  });

  it('treats an empty key as missing', () => {
    expect(loadConfig({ DEEPSEEK_API_KEY: '' })._unsafeUnwrapErr()).toContain(
      'DEEPSEEK_API_KEY',
    );
  });

  it('returns Err naming every invalid variable', () => {
    const message = loadConfig({ SERVER_PORT: 'abc' })._unsafeUnwrapErr();
    expect(message).toContain('DEEPSEEK_API_KEY');
    expect(message).toContain('SERVER_PORT');
  });
});
