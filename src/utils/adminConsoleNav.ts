export type AdminSectionId =
  | 'overview'
  | 'payments'
  | 'mfs'
  | 'finance'
  | 'models'
  | 'providers'
  | 'users'
  | 'pixel'
  | 'email'
  | 'seo';

export interface AdminNavItem {
  id: AdminSectionId;
  label: string;
  shortLabel: string;
  description: string;
  groupId: string;
  groupLabel: string;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        shortLabel: 'Overview',
        description: 'Live revenue, subscribers, payment queue, and model token consumption.',
        groupId: 'dashboard',
        groupLabel: 'Dashboard'
      }
    ]
  },
  {
    id: 'billing',
    label: 'Billing & Orders',
    items: [
      {
        id: 'payments',
        label: 'Payments Verification',
        shortLabel: 'Payments',
        description: 'Verify bKash, Nagad, and Rocket TrxID orders and activate plans.',
        groupId: 'billing',
        groupLabel: 'Billing & Orders'
      },
      {
        id: 'mfs',
        label: 'MFS Gateways',
        shortLabel: 'MFS Gateways',
        description: 'Turn bKash, Nagad, or Rocket ON/OFF in checkout and manage merchant numbers.',
        groupId: 'billing',
        groupLabel: 'Billing & Orders'
      },
      {
        id: 'finance',
        label: 'Money Management',
        shortLabel: 'Money & Ads',
        description: 'Track Meta Ads spend, daily subscription revenue, and net profit.',
        groupId: 'billing',
        groupLabel: 'Billing & Orders'
      }
    ]
  },
  {
    id: 'ai',
    label: 'AI Engine',
    items: [
      {
        id: 'models',
        label: 'AI Models Catalog',
        shortLabel: 'Models',
        description: 'Bulk turn ON/OFF Paid or Free models, sync catalog, and customize model branding.',
        groupId: 'ai',
        groupLabel: 'AI Engine'
      },
      {
        id: 'providers',
        label: 'Providers & API Keys',
        shortLabel: 'API Keys',
        description: 'Configure your unified OpenRouter API key and optional direct provider keys.',
        groupId: 'ai',
        groupLabel: 'AI Engine'
      }
    ]
  },
  {
    id: 'users',
    label: 'Users & Access',
    items: [
      {
        id: 'users',
        label: 'Users & Quotas',
        shortLabel: 'Users',
        description: 'Manage user accounts, global default token quotas, limits, and subscriptions.',
        groupId: 'users',
        groupLabel: 'Users & Access'
      }
    ]
  },
  {
    id: 'integrations',
    label: 'Site & Integrations',
    items: [
      {
        id: 'pixel',
        label: 'Meta Pixel (Ads)',
        shortLabel: 'Meta Pixel',
        description: 'Configure Facebook Pixel browser events and Conversions API server tracking.',
        groupId: 'integrations',
        groupLabel: 'Site & Integrations'
      },
      {
        id: 'email',
        label: 'Email System',
        shortLabel: 'Email',
        description: 'Configure Google Apps Script webhook for OTPs, receipts, and admin alerts.',
        groupId: 'integrations',
        groupLabel: 'Site & Integrations'
      },
      {
        id: 'seo',
        label: 'SEO & Support',
        shortLabel: 'SEO & Support',
        description: 'Manage social share meta tags, OG banner preview, and public support contacts.',
        groupId: 'integrations',
        groupLabel: 'Site & Integrations'
      }
    ]
  }
];

export const ALL_ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap(g => g.items);

export function getAdminNavItem(sectionId: AdminSectionId): AdminNavItem {
  return ALL_ADMIN_NAV_ITEMS.find(item => item.id === sectionId) || ALL_ADMIN_NAV_ITEMS[0];
}
