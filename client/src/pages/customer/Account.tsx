import { useEffect, useState, type FormEvent } from 'react';
import { CustomerLayout } from './CustomerLayout';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/useAuth';

interface Form {
  name: string;
  phone: string;
  cpf: string;
  cnh: string;
  birthdate: string;
}

const EMPTY: Form = { name: '', phone: '', cpf: '', cnh: '', birthdate: '' };

export function Account() {
  const { refresh } = useAuth();
  const [form, setForm] = useState<Form>(EMPTY);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    let cancel = false;
    api.profile.get().then(r => {
      if (cancel) return;
      setForm({
        name: r.user.name || '',
        phone: r.user.phone || '',
        cpf: r.user.cpf || '',
        cnh: r.user.cnh || '',
        birthdate: r.user.birthdate || '',
      });
      setEmail(r.user.email || '');
      setRole(r.user.role || '');
      setLoading(false);
    }).catch(() => { if (!cancel) setLoading(false); });
    return () => { cancel = true; };
  }, []);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.profile.update(form);
      await refresh();
      setMsg({ type: 'ok', text: 'Dados atualizados.' });
    } catch (err: unknown) {
      setMsg({ type: 'err', text: 'Erro: ' + ((err as { code?: string }).code || 'falha') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <CustomerLayout title="Dados pessoais" subtitle="Conta · informações">
      {loading ? (
        <div className="c-empty">Carregando…</div>
      ) : (
        <form className="c-form" onSubmit={submit}>
          <div className="c-form__row">
            <label>E-mail</label>
            <input value={email} readOnly />
          </div>
          <div className="c-form__row">
            <label>Tipo de conta</label>
            <input value={role} readOnly />
          </div>
          <div className="c-form__row">
            <label>Nome completo</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>
          <div className="c-form__pair">
            <div className="c-form__row">
              <label>Celular</label>
              <input value={form.phone} placeholder="(11) 00000-0000" onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="c-form__row">
              <label>Data de nascimento</label>
              <input type="date" value={form.birthdate} onChange={e => set('birthdate', e.target.value)} />
            </div>
          </div>
          <div className="c-form__pair">
            <div className="c-form__row">
              <label>CPF</label>
              <input value={form.cpf} placeholder="000.000.000-00" onChange={e => set('cpf', e.target.value)} />
            </div>
            <div className="c-form__row">
              <label>CNH</label>
              <input value={form.cnh} placeholder="número de registro" onChange={e => set('cnh', e.target.value)} />
            </div>
          </div>

          {msg && (
            <div className={`c-form__msg c-form__msg--${msg.type === 'ok' ? 'ok' : 'err'}`}>
              {msg.text}
            </div>
          )}

          <div className="c-form__actions">
            <button type="submit" className="c-btn c-btn--primary" disabled={saving}>
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      )}
    </CustomerLayout>
  );
}
