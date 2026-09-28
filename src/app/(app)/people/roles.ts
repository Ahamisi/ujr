export const ROLES = [
  { id: 'journal_manager', label: 'Admin' },
  { id: 'handling_editor', label: 'Editor' },
  { id: 'finance_officer', label: 'Finance' },
  { id: 'copyeditor', label: 'Production' },
  { id: 'reviewer', label: 'Reviewer' },
  { id: 'author', label: 'Author' },
] as const

export const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map((role) => [role.id, role.label]))

export const ROLE_BADGE: Record<string, 'default' | 'info' | 'warning' | 'secondary' | 'outline'> = {
  journal_manager: 'default',
  handling_editor: 'info',
  finance_officer: 'warning',
  copyeditor: 'secondary',
  reviewer: 'outline',
  author: 'secondary',
}

export interface Person {
  id: string
  email: string
  name: string
  roles: string[]
}

export function roleLabel(role: string) {
  return ROLE_LABEL[role] ?? role.replaceAll('_', ' ')
}
