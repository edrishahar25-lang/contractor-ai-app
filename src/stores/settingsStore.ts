import { create } from 'zustand';
import { PricingSettings, CompanySettings } from '../types';
import {
  DEFAULT_PRICING_SETTINGS,
  DEFAULT_COMPANY_SETTINGS,
} from '../lib/pricingEngine';
import { storage } from '../lib/storage';

interface SettingsStore {
  pricing: PricingSettings;
  company: CompanySettings;
  isCompanyConfigured: boolean;

  setPricing: (s: PricingSettings) => void;
  setCompany: (s: CompanySettings) => void;
  updatePricing: (patch: Partial<PricingSettings>) => void;
  updateCompany: (patch: Partial<CompanySettings>) => void;
  setItemPrice: (key: string, price: number) => void;
}

function checkConfigured(company: CompanySettings): boolean {
  return company.companyName.trim().length > 0 && company.phone.trim().length > 0;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  pricing: storage.load<PricingSettings>(storage.pricingKey, DEFAULT_PRICING_SETTINGS),
  company: storage.load<CompanySettings>(storage.companyKey, DEFAULT_COMPANY_SETTINGS),
  isCompanyConfigured: checkConfigured(
    storage.load<CompanySettings>(storage.companyKey, DEFAULT_COMPANY_SETTINGS),
  ),

  setPricing: (s) => {
    storage.save(storage.pricingKey, s);
    set({ pricing: s });
  },

  setCompany: (s) => {
    storage.save(storage.companyKey, s);
    set({ company: s, isCompanyConfigured: checkConfigured(s) });
  },

  updatePricing: (patch) => {
    const next = { ...get().pricing, ...patch };
    storage.save(storage.pricingKey, next);
    set({ pricing: next });
  },

  updateCompany: (patch) => {
    const next = { ...get().company, ...patch };
    storage.save(storage.companyKey, next);
    set({ company: next, isCompanyConfigured: checkConfigured(next) });
  },

  setItemPrice: (key, price) => {
    const next = {
      ...get().pricing,
      itemPrices: { ...get().pricing.itemPrices, [key]: price },
    };
    storage.save(storage.pricingKey, next);
    set({ pricing: next });
  },
}));
