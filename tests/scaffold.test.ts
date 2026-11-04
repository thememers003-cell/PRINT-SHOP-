import { describe, it, expect } from 'vitest';

describe('Project Scaffold', () => {
  it('should have environment defined', () => {
    expect(process.env.NODE_ENV).toBeDefined();
  });
});

