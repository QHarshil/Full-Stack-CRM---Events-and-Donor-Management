const ACTION_LABELS: Record<string, string> = {
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  login: 'Login',
  logout: 'Logout',
  baseline: 'Baseline',
};

export function getAuditActionLabel(action?: string | null) {
  if (!action) {
    return 'Unknown';
  }

  const normalized = action.toLowerCase();
  if (ACTION_LABELS[normalized]) {
    return ACTION_LABELS[normalized];
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export const AUDIT_ACTION_LABEL_MAP = ACTION_LABELS;
