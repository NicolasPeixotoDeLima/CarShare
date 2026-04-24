import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Nav } from '../components/Nav';
import { useAuth } from '../lib/useAuth';
import './Help.css';

interface QA { q: string; a: string; }

const FAQ: Array<{ section: string; items: QA[] }> = [
  {
    section: 'Assinatura',
    items: [
      { q: 'Como funciona a assinatura mensal?',
        a: 'Você escolhe o carro, o prazo (1, 3, 6 ou 12 meses) e a franquia de km. A primeira mensalidade é cobrada na ativação, as seguintes todo dia 10. Cancele quando quiser nos primeiros 7 dias sem multa.' },
      { q: 'Posso trocar de carro durante a assinatura?',
        a: 'Sim. A qualquer momento, basta abrir uma nova reserva pela área "Trocar de modelo" — finalizamos a anterior automaticamente.' },
      { q: 'Existe taxa de adesão?',
        a: 'Não. Adesão sempre isenta. Você paga só a mensalidade, conforme o prazo escolhido.' },
    ],
  },
  {
    section: 'Pagamento',
    items: [
      { q: 'Quais formas de pagamento são aceitas?',
        a: 'Cartão de crédito (recorrência automática), Pix (aprovação em 30s) e boleto bancário (R$ 4,90 por emissão).' },
      { q: 'Onde acompanho minhas faturas?',
        a: 'Na área "Faturas" do seu perfil. Lá aparecem todas as cobranças, pagas e em aberto, com link de download.' },
      { q: 'Como funciona o cancelamento?',
        a: 'Cancele direto pelo perfil. Sem multa nos primeiros 7 dias; após esse prazo, paga-se as mensalidades vencidas até a data de cancelamento.' },
    ],
  },
  {
    section: 'Documentos & Entrega',
    items: [
      { q: 'Quais documentos eu preciso?',
        a: 'CNH válida (categoria B ou superior) e comprovante de residência. Maioridade civil (21+) é necessária para pegar carros de luxo.' },
      { q: 'Quanto tempo leva a entrega?',
        a: 'Hubs urbanos: 24h. Demais cidades: até 48h. Entrega agendada em até 7 dias.' },
      { q: 'O que está incluso?',
        a: 'Seguro contra terceiros, manutenção preventiva, assistência 24h e troca de pneus por desgaste.' },
    ],
  },
  {
    section: 'Para proprietários',
    items: [
      { q: 'Como cadastro meu carro para alugar na plataforma?',
        a: 'Crie uma conta marcando "Sou proprietário" no cadastro. No painel do proprietário, use "Cadastrar carro" e preencha os dados do veículo.' },
      { q: 'Quanto a CarShare cobra de comissão?',
        a: 'Atualmente 0% — fase de lançamento. As condições comerciais podem mudar com aviso prévio de 30 dias.' },
      { q: 'Como recebo as reservas dos meus carros?',
        a: 'No painel do proprietário, em "Reservas recebidas". Lá ficam todas as reservas, ativas e históricas, com nome e contato do cliente.' },
    ],
  },
];

export function Help() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState<string | null>(null);

  return (
    <>
      <Nav user={user} onLogout={logout} activeSection="help" />

      <div className="help-shell">
        <header className="help-head">
          <div className="help-head__eb">Central de ajuda</div>
          <h1>Como podemos <span className="italic">ajudar?</span></h1>
          <p>Respostas para as dúvidas mais comuns. Não achou o que precisa?{' '}
            <a href="mailto:contato@carshare.exemplo">Fale com a gente</a>.
          </p>
        </header>

        <div className="help-body">
          {FAQ.map((group, i) => (
            <section key={group.section} className="help-group" style={{ ['--i' as never]: i }}>
              <h2>{group.section}</h2>
              {group.items.map((item, i) => {
                const id = group.section + '__' + i;
                const isOpen = open === id;
                return (
                  <button
                    key={id}
                    className={`help-q ${isOpen ? 'is-on' : ''}`}
                    onClick={() => setOpen(isOpen ? null : id)}
                  >
                    <div className="help-q__row">
                      <span>{item.q}</span>
                      <span className="help-q__icon">{isOpen ? '–' : '+'}</span>
                    </div>
                    {isOpen && <div className="help-q__a">{item.a}</div>}
                  </button>
                );
              })}
            </section>
          ))}
        </div>

        <footer className="help-foot">
          <Link to="/" className="help-foot__back">← Voltar para a home</Link>
        </footer>
      </div>
    </>
  );
}
