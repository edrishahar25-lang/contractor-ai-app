/**
 * storage.ts
 * Isolated localStorage abstraction.
 * Future: replace load/save with Supabase calls without touching stores.
 */

const KEYS = {
  projects: 'cap_v2_projects',
  pricing: 'cap_v2_pricing',
  company: 'cap_v2_company',
  wizardDraft: 'cap_v2_wizard_draft',
} as const;

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded – fail silently
  }
}

function remove(key: string): void {
  localStorage.removeItem(key);
}

export const storage = {
  // Generic
  load,
  save,
  remove,
  // Named accessors used by stores
  projectsKey: KEYS.projects,
  pricingKey: KEYS.pricing,
  companyKey: KEYS.company,
  wizardDraftKey: KEYS.wizardDraft,
};
