import { describe, it, expect } from 'vitest';
import { generateRandom, JoseUtil } from '../../src/crypto/Crypto.js';

describe('crypto/generateRandom', () => {
  it('should generate a random string', () => {
    const random = generateRandom();
    expect(random).toBeTypeOf('string');
    expect(random.length).toBeGreaterThan(0);
  });

  it('should generate different values on each call', () => {
    const random1 = generateRandom();
    const random2 = generateRandom();
    expect(random1).not.toBe(random2);
  });

  it('should generate URL-safe characters', () => {
    const random = generateRandom();
    // Should only contain URL-safe base64 characters
    expect(random).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('crypto/JoseUtil', () => {
  const validJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  it('should export JoseUtil class', () => {
    expect(JoseUtil).toBeDefined();
  });

  it('should parse JWT', () => {
    const parsed = JoseUtil.parseJwt(validJwt);
    expect(parsed).toBeDefined();
    expect(parsed.header).toBeDefined();
    expect(parsed.payload).toBeDefined();
  });

  it('should extract payload from JWT', () => {
    const parsed = JoseUtil.parseJwt(validJwt);
    expect(parsed.payload.sub).toBe('1234567890');
    expect(parsed.payload.name).toBe('John Doe');
  });

  it('should hash string', async () => {
    const hash = await JoseUtil.hashString('test', 'SHA256');
    expect(hash).toBeTypeOf('string');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should convert hex to base64url', () => {
    const hex = '48656c6c6f'; // "Hello" in hex
    const base64url = JoseUtil.hexToBase64Url(hex);
    expect(base64url).toBeTypeOf('string');
    expect(base64url).not.toContain('+');
    expect(base64url).not.toContain('/');
    expect(base64url).not.toContain('=');
  });
});
