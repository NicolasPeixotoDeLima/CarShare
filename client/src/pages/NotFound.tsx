import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 40 }}>
      <div style={{ textAlign: 'center' }}>
        <h1 className="serif" style={{ fontSize: 72, lineHeight: 1, marginBottom: 14 }}>
          404
        </h1>
        <p style={{ color: 'var(--fg-dim)', marginBottom: 24 }}>
          A página que você procura não existe.
        </p>
        <Link to="/" style={{ color: 'var(--amber)' }}>← Voltar para a home</Link>
      </div>
    </div>
  );
}
