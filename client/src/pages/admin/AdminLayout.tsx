import { type ReactNode } from 'react';
import { AppLayout } from '../customer/CustomerLayout';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Compatibilidade — todas as paginas de admin usam o shell unificado. */
export function AdminLayout(props: Props) {
  return <AppLayout {...props} requiredRole="admin" />;
}
