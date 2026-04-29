/**
 * Tag colorida pra status (active, scheduled, finished, paid, overdue, …).
 * As classes `tag--*` ja existem em admin.css/customer.css. Este componente
 * apenas centraliza o markup.
 */
type Variant =
  | 'active' | 'scheduled' | 'finished' | 'cancelled'
  | 'paid'   | 'open'      | 'overdue'
  | 'admin'  | 'cliente'   | 'proprietario';

interface Props {
  variant: Variant | string;
  children?: React.ReactNode;
}

export function StatusTag({ variant, children }: Props) {
  return <span className={`tag tag--${variant}`}>{children ?? variant}</span>;
}
