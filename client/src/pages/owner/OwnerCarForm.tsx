import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { OwnerLayout } from './OwnerLayout';
import { api } from '../../lib/api';
import type { Car, Category, Fuel, Hub, Transmission } from '../../lib/types';

const CATS: Category[]      = ['urbano','seda','suv','pickup','eletrico','luxo'];
const FUELS: Fuel[]         = ['flex','hibrido','eletrico','diesel'];
const TRANS: Transmission[] = ['automatico','cvt','manual'];
const HUBS: Hub[]           = ['sao-paulo','rio','bh','curitiba','poa'];

interface Form {
  slug: string;
  brand: string;
  model: string;
  year: number | '';
  category: Category;
  fuel: Fuel;
  transmission: Transmission;
  seats: number | '';
  range_km: number | '';
  power_hp: number | '';
  delivery_hours: number | '';
  hub: Hub;
  price_month: number | '';
  description: string;
  stock: number | '';
}

const EMPTY: Form = {
  slug: '', brand: '', model: '', year: new Date().getFullYear(),
  category: 'urbano', fuel: 'flex', transmission: 'automatico',
  seats: 5, range_km: '', power_hp: '', delivery_hours: 48,
  hub: 'sao-paulo', price_month: '', description: '', stock: 1,
};

function slugify(s: string) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function OwnerCarForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const editing = id !== undefined;
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    let cancel = false;
    api.cars.get(id!)
      .then(c => {
        if (cancel) return;
        setForm({
          slug: c.slug,
          brand: c.brand,
          model: c.model,
          year: c.year,
          category: c.category,
          fuel: c.fuel,
          transmission: c.transmission,
          seats: c.seats,
          range_km: c.range_km ?? '',
          power_hp: c.power_hp ?? '',
          delivery_hours: c.delivery_hours,
          hub: c.hub,
          price_month: c.price_month,
          description: c.description ?? '',
          stock: c.stock,
        });
        setLoading(false);
      })
      .catch(() => { setErr('Carro não encontrado.'); setLoading(false); });
    return () => { cancel = true; };
  }, [id, editing]);

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const payload: Partial<Car> = {
        slug: form.slug || slugify(`${form.brand}-${form.model}-${form.year}`),
        brand: form.brand,
        model: form.model,
        year: Number(form.year),
        category: form.category,
        fuel: form.fuel,
        transmission: form.transmission,
        seats: Number(form.seats),
        range_km: form.range_km === '' ? null : Number(form.range_km),
        power_hp: form.power_hp === '' ? null : Number(form.power_hp),
        delivery_hours: Number(form.delivery_hours) || 48,
        hub: form.hub,
        price_month: Number(form.price_month),
        description: form.description || null,
        stock: Number(form.stock) || 1,
      };
      if (editing) {
        await api.owner.updateCar(Number(id), payload);
      } else {
        await api.owner.createCar(payload);
      }
      navigate('/owner/cars');
    } catch (e: unknown) {
      setErr('Erro: ' + ((e as { code?: string }).code || 'falha'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <OwnerLayout
      subtitle={editing ? 'Edição' : 'Novo carro'}
      title={editing ? `Editar carro #${id}` : 'Cadastrar carro'}
    >
      {loading ? (
        <div className="empty">Carregando…</div>
      ) : (
        <form className="panel" onSubmit={submit} style={{ padding: 24, display: 'grid', gap: 16 }}>
          <Row>
            <Field label="Marca">
              <input value={form.brand} onChange={e => set('brand', e.target.value)} required />
            </Field>
            <Field label="Modelo">
              <input value={form.model} onChange={e => set('model', e.target.value)} required />
            </Field>
          </Row>

          <Row>
            <Field label="Ano">
              <input type="number" min={1990} max={2030} value={form.year}
                onChange={e => set('year', e.target.value === '' ? '' : Number(e.target.value))} required />
            </Field>
            <Field label="Slug (URL)">
              <input value={form.slug} placeholder="auto-gerado se vazio" onChange={e => set('slug', e.target.value)} />
            </Field>
          </Row>

          <Row>
            <Field label="Categoria">
              <select value={form.category} onChange={e => set('category', e.target.value as Category)}>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Combustível">
              <select value={form.fuel} onChange={e => set('fuel', e.target.value as Fuel)}>
                {FUELS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Câmbio">
              <select value={form.transmission} onChange={e => set('transmission', e.target.value as Transmission)}>
                {TRANS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </Row>

          <Row>
            <Field label="Lugares">
              <input type="number" min={2} max={9} value={form.seats}
                onChange={e => set('seats', e.target.value === '' ? '' : Number(e.target.value))} required />
            </Field>
            <Field label="Autonomia (km)">
              <input type="number" value={form.range_km}
                onChange={e => set('range_km', e.target.value === '' ? '' : Number(e.target.value))} />
            </Field>
            <Field label="Potência (cv)">
              <input type="number" value={form.power_hp}
                onChange={e => set('power_hp', e.target.value === '' ? '' : Number(e.target.value))} />
            </Field>
          </Row>

          <Row>
            <Field label="Hub de entrega">
              <select value={form.hub} onChange={e => set('hub', e.target.value as Hub)}>
                {HUBS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </Field>
            <Field label="Entrega (horas)">
              <input type="number" value={form.delivery_hours}
                onChange={e => set('delivery_hours', e.target.value === '' ? '' : Number(e.target.value))} />
            </Field>
          </Row>

          <Row>
            <Field label="Mensalidade (R$)">
              <input type="number" min={0} value={form.price_month}
                onChange={e => set('price_month', e.target.value === '' ? '' : Number(e.target.value))} required />
            </Field>
            <Field label="Estoque (unidades)">
              <input type="number" min={1} value={form.stock}
                onChange={e => set('stock', e.target.value === '' ? '' : Number(e.target.value))} required />
            </Field>
          </Row>

          <Field label="Descrição">
            <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} />
          </Field>

          {err && <div className="c-form__msg c-form__msg--err">{err}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn" onClick={() => navigate('/owner/cars')}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar carro'}
            </button>
          </div>
        </form>
      )}
    </OwnerLayout>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Array.isArray(children) ? children.length : 1}, 1fr)`, gap: 12 }}>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--fg-mute)', textTransform: 'uppercase', letterSpacing: '.12em' }}>{label}</span>
      {children}
    </label>
  );
}
