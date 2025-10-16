import { describe, expect, it } from 'vitest';
import { getAuditActionLabel } from '../auditUtils.ts';

describe('getAuditActionLabel', () => {
  it('returns friendly labels for known actions', () => {
    expect(getAuditActionLabel('create')).toBe('Create');
    expect(getAuditActionLabel('UPDATE')).toBe('Update');
    expect(getAuditActionLabel('baseline')).toBe('Baseline');
  });

  it('falls back to capitalised action name', () => {
    expect(getAuditActionLabel('custom_action')).toBe('Custom_action');
  });

  it('returns Unknown when action is missing', () => {
    expect(getAuditActionLabel('')).toBe('Unknown');
    expect(getAuditActionLabel(undefined)).toBe('Unknown');
  });
});
