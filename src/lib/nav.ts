import type { UserRole } from '@/types/database';
import {
  LayoutDashboard,
  CalendarDays,
  BedDouble,
  Users,
  Sparkles,
  BarChart3,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[]; // roles con acceso a la ruta
}

const ALL: UserRole[] = ['admin', 'manager', 'reception', 'housekeeping'];

// Navegación principal del dashboard. El orden define el del sidebar.
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ALL },
  {
    href: '/calendar',
    label: 'Calendario',
    icon: CalendarDays,
    roles: ['admin', 'manager', 'reception'],
  },
  {
    href: '/reservations',
    label: 'Reservas',
    icon: BedDouble,
    roles: ['admin', 'manager', 'reception'],
  },
  {
    href: '/guests',
    label: 'Huéspedes',
    icon: Users,
    roles: ['admin', 'manager', 'reception'],
  },
  {
    href: '/housekeeping',
    label: 'Housekeeping',
    icon: Sparkles,
    roles: ALL,
  },
  {
    href: '/reports',
    label: 'Reportes',
    icon: BarChart3,
    roles: ['admin', 'manager'],
  },
  {
    href: '/settings',
    label: 'Configuración',
    icon: Settings,
    roles: ['admin', 'manager'],
  },
];

export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
