import { useNavigate, useLocation } from 'react-router-dom';
import './BackButton.css';

interface Props {
  /** Rota usada quando nao ha historico. Default: '/' */
  fallback?: string;
  /** Texto do botao. Default: 'Voltar' */
  label?: string;
  className?: string;
}

/**
 * Botao "Voltar" universal: usa o historico do browser, com fallback pra
 * uma rota dada caso a pessoa tenha entrado direto pela URL.
 */
export function BackButton({ fallback = '/', label = 'Voltar', className }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  function handle() {
    // window.history.length > 1 nao é confiavel (sempre >= 1 e nao distingue
    // entradas externas). Em vez disso, tentamos voltar; se a rota nao mudar
    // depois de um tick, redirecionamos pro fallback.
    const before = location.pathname + location.search;
    navigate(-1);
    setTimeout(() => {
      if (window.location.pathname + window.location.search === before) {
        navigate(fallback, { replace: true });
      }
    }, 60);
  }

  return (
    <button
      type="button"
      className={`back-btn${className ? ' ' + className : ''}`}
      onClick={handle}
      title={label}
      aria-label={label}
    >
      <span className="back-btn__arrow" aria-hidden>←</span>
      <span className="back-btn__label">{label}</span>
    </button>
  );
}
