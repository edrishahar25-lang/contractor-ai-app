/**
 * whatsapp.ts
 * Generates WhatsApp share URLs for estimate sharing.
 */

import { Project, EstimateVersion, CompanySettings } from '../types';
import { formatCurrency, formatDate } from './format';

export function israeliPhoneToIntl(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('972')) return cleaned;
  if (cleaned.startsWith('0')) return '972' + cleaned.slice(1);
  return '972' + cleaned;
}

export function buildWhatsAppMessage(
  project: Project,
  version: EstimateVersion,
  company: CompanySettings,
): string {
  const expiresAt = project.expiresAt
    ? formatDate(project.expiresAt)
    : 'לא צוין';

  const lines = [
    `שלום ${project.client.name},`,
    '',
    `מצורפת הצעת מחיר לעבודות בכתובת ${project.client.address}, ${project.client.city}`,
    '',
    `סה"כ: ${formatCurrency(version.result.total)} כולל מע"מ`,
    `תוקף ההצעה: ${expiresAt}`,
    '',
    'לפרטים:',
    company.companyName || 'Contractor AI Pro',
    company.phone || '',
  ].filter((l) => l !== null && (l !== '' || true));

  return lines.join('\n');
}

export function openWhatsApp(
  project: Project,
  version: EstimateVersion,
  company: CompanySettings,
): void {
  const message = buildWhatsAppMessage(project, version, company);
  const encoded = encodeURIComponent(message);

  const phone = project.client.phone
    ? israeliPhoneToIntl(project.client.phone)
    : '';

  const url = phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  window.open(url, '_blank', 'noopener,noreferrer');
}

export function buildWhatsAppShortMessage(
  project: Project,
  company: CompanySettings,
): string {
  const address = [project.client.address, project.client.city].filter(Boolean).join(', ');
  const lines = [
    `שלום ${project.client.name},`,
    `מצורפת הצעת המחיר לעבודות בכתובת ${address}.`,
    'לכל שאלה אני זמין.',
    '',
    company.companyName || '',
    company.phone || '',
  ].filter((l) => l !== '');

  return lines.join('\n');
}

export function openWhatsAppShort(
  project: Project,
  company: CompanySettings,
): void {
  const message = buildWhatsAppShortMessage(project, company);
  const encoded = encodeURIComponent(message);

  const phone = project.client.phone
    ? israeliPhoneToIntl(project.client.phone)
    : '';

  const url = phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  window.open(url, '_blank', 'noopener,noreferrer');
}
