import type { Category, CategoryId } from '@/types/domain';

export const CATEGORIES: Record<CategoryId, Category> = {
  food: { id: 'food', label: 'Alimentación', icon: 'utensils', essential: true },
  delivery: { id: 'delivery', label: 'Delivery', icon: 'bike', essential: false },
  transport: { id: 'transport', label: 'Transporte', icon: 'bus', essential: true },
  housing: { id: 'housing', label: 'Vivienda', icon: 'house', essential: true },
  services: { id: 'services', label: 'Servicios', icon: 'plug-zap', essential: true },
  health: { id: 'health', label: 'Salud', icon: 'heart-pulse', essential: true },
  education: { id: 'education', label: 'Educación', icon: 'graduation-cap', essential: true },
  entertainment: { id: 'entertainment', label: 'Entretenimiento', icon: 'party-popper', essential: false },
  shopping: { id: 'shopping', label: 'Compras', icon: 'shopping-bag', essential: false },
  subscriptions: { id: 'subscriptions', label: 'Suscripciones', icon: 'repeat', essential: false },
  debt: { id: 'debt', label: 'Deudas', icon: 'credit-card', essential: true },
  savings: { id: 'savings', label: 'Ahorro', icon: 'piggy-bank', essential: false },
  salary: { id: 'salary', label: 'Sueldo', icon: 'wallet', essential: false },
  transfer: { id: 'transfer', label: 'Transferencia', icon: 'arrow-left-right', essential: false },
  pets: { id: 'pets', label: 'Mascotas', icon: 'paw-print', essential: false },
  other: { id: 'other', label: 'Otro', icon: 'circle-dashed', essential: false },
};

export function getCategory(id: CategoryId): Category {
  return CATEGORIES[id];
}
