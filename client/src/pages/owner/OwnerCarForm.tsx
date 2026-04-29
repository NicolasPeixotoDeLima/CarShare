import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { OwnerLayout } from './OwnerLayout';
import { CarSilhouette } from '../../components/CarSilhouette';
import { Select } from '../../components/Select';
import { api, fmt, LABELS } from '../../lib/api';
import type { Car, Category, Fuel, Hub, KmOption, Transmission } from '../../lib/types';
import './OwnerCarForm.css';

const CATS: Category[]      = ['urbano','seda','suv','pickup','eletrico','luxo'];
const FUELS: Fuel[]         = ['flex','hibrido','eletrico','diesel'];
const TRANS: Transmission[] = ['automatico','cvt','manual'];
const HUBS: Hub[]           = ['sao-paulo','rio','bh','curitiba','poa'];

interface KmRow {
  /** "1500", "2500", "5000", "livre" ou km custom como string */
  value: string;
  /** valor digitado para surcharge — string vazia eh permitida no draft */
  surcharge: number | '';
}

type TermKey = '1' | '3' | '6' | '12';
const TERMS: TermKey[] = ['1', '3', '6', '12'];
type TermPrices = Record<TermKey, number | ''>;

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
  km_options: KmRow[];
  term_prices: TermPrices;
}

const DEFAULT_KM_OPTIONS: KmRow[] = [
  { value: '1500',  surcharge: 0 },
  { value: '2500',  surcharge: 180 },
  { value: 'livre', surcharge: 420 },
];

const EMPTY: Form = {
  slug: '', brand: '', model: '', year: new Date().getFullYear(),
  category: 'urbano', fuel: 'flex', transmission: 'automatico',
  seats: 5, range_km: '', power_hp: '', delivery_hours: 48,
  hub: 'sao-paulo', price_month: '', description: '', stock: 1,
  km_options: DEFAULT_KM_OPTIONS,
  term_prices: { '1': '', '3': '', '6': '', '12': '' },
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
          km_options: (c.km_options && c.km_options.length > 0
            ? c.km_options.map(o => ({ value: o.value, surcharge: o.surcharge }))
            : DEFAULT_KM_OPTIONS),
          term_prices: {
            '1':  c.term_prices?.['1']  ?? c.price_month,
            '3':  c.term_prices?.['3']  ?? Math.round(c.price_month * 0.95),
            '6':  c.term_prices?.['6']  ?? Math.round(c.price_month * 0.92),
            '12': c.term_prices?.['12'] ?? Math.round(c.price_month * 0.88),
          },
        });
        setLoading(false);
      })
      .catch(() => { setErr('Carro não encontrado.'); setLoading(false); });
    return () => { cancel = true; };
  }, [id, editing]);

  /* ============== term_prices helpers ============== */

  /** Quando o owner muda o preco mensal (1 mes) num cadastro novo, sugere
   *  precos com desconto historico nos demais prazos. Owner pode sobrescrever. */
  const [termPricesDirty, setTermPricesDirty] = useState(false);
  useEffect(() => {
    if (editing) return;
    if (termPricesDirty) return;
    const base = Number(form.price_month);
    if (!Number.isFinite(base) || base <= 0) return;
    setForm(prev => ({
      ...prev,
      term_prices: {
        '1':  base,
        '3':  Math.round(base * 0.95),
        '6':  Math.round(base * 0.92),
        '12': Math.round(base * 0.88),
      },
    }));
  }, [form.price_month, editing, termPricesDirty]);

  function setTermPrice(t: TermKey, v: number | '') {
    setTermPricesDirty(true);
    setForm(prev => ({ ...prev, term_prices: { ...prev.term_prices, [t]: v } }));
  }

  /* ============== km_options helpers ============== */

  function setKmRow(idx: number, patch: Partial<KmRow>) {
    setForm(prev => ({
      ...prev,
      km_options: prev.km_options.map((row, i) => i === idx ? { ...row, ...patch } : row),
    }));
  }
  function addKmRow() {
    setForm(prev => ({
      ...prev,
      km_options: [...prev.km_options, { value: '', surcharge: 0 }],
    }));
  }
  function removeKmRow(idx: number) {
    setForm(prev => {
      // Pelo menos 1 opcao tem que ficar
      if (prev.km_options.length <= 1) return prev;
      return { ...prev, km_options: prev.km_options.filter((_, i) => i !== idx) };
    });
  }

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  const previewSlug = useMemo(() => {
    return form.slug || slugify(`${form.brand}-${form.model}-${form.year}`);
  }, [form.slug, form.brand, form.model, form.year]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);

    // Validacao client-side de km_options: pelo menos 1, sem duplicatas, sem vazios
    const kmFinal: KmOption[] = [];
    const seen = new Set<string>();
    for (const row of form.km_options) {
      const v = String(row.value).trim();
      if (!v) continue;
      if (v !== 'livre' && !/^\d{2,6}$/.test(v)) {
        setErr('Franquia inválida: use um número em km ou "livre".');
        setSaving(false);
        return;
      }
      if (seen.has(v)) {
        setErr('Franquias duplicadas — cada valor só pode aparecer uma vez.');
        setSaving(false);
        return;
      }
      seen.add(v);
      kmFinal.push({ value: v, surcharge: Number(row.surcharge) || 0 });
    }
    if (kmFinal.length === 0) {
      setErr('Defina pelo menos uma franquia mensal.');
      setSaving(false);
      return;
    }

    // term_prices: todos os 4 prazos precisam ter valor positivo
    const tpFinal: Record<TermKey, number> = { '1': 0, '3': 0, '6': 0, '12': 0 };
    for (const t of TERMS) {
      const n = Number(form.term_prices[t]);
      if (!Number.isFinite(n) || n <= 0) {
        setErr(`Defina o preço mensal para ${t} ${t === '1' ? 'mês' : 'meses'}.`);
        setSaving(false);
        return;
      }
      tpFinal[t] = Math.round(n);
    }

    try {
      const payload: Partial<Car> = {
        slug: previewSlug,
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
        km_options: kmFinal,
        term_prices: tpFinal,
      };
      if (editing) {
        await api.owner.updateCar(Number(id), payload);
      } else {
        await api.owner.createCar(payload);
      }
      navigate('/owner/cars');
    } catch (e: unknown) {
      setErr('Erro: ' + ((e as { code?: string }).code || 'falha ao salvar'));
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
        <form className="car-form" onSubmit={submit}>
          <div className="car-form__main">
            {/* ---------- 1 · IDENTIDADE ---------- */}
            <Section num="1" title="Identidade" sub="Como o carro aparece no anúncio.">
              <div className="cf-grid cf-grid--2">
                <Field label="Marca" required>
                  <input
                    className="cf-input"
                    value={form.brand}
                    onChange={e => set('brand', e.target.value)}
                    placeholder="Ex: Toyota"
                    required
                  />
                </Field>
                <Field label="Modelo" required>
                  <input
                    className="cf-input"
                    value={form.model}
                    onChange={e => set('model', e.target.value)}
                    placeholder="Ex: Corolla XEi"
                    required
                  />
                </Field>
              </div>

              <div className="cf-grid cf-grid--2">
                <Field label="Ano" required>
                  <input
                    className="cf-input"
                    type="number" min={1990} max={2030}
                    value={form.year}
                    onChange={e => set('year', e.target.value === '' ? '' : Number(e.target.value))}
                    required
                  />
                </Field>
                <Field
                  label="Slug (URL)"
                  hint={form.slug ? 'manual' : 'auto-gerado a partir de marca/modelo/ano'}
                >
                  <input
                    className="cf-input"
                    value={form.slug}
                    onChange={e => set('slug', e.target.value)}
                    placeholder={previewSlug || 'auto-gerado'}
                  />
                </Field>
              </div>

              <Field label="Descrição" hint="Texto curto exibido na página do carro.">
                <textarea
                  className="cf-textarea"
                  rows={3}
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Ex: Sedã híbrido, autonomia gigante e conforto de viagem."
                />
              </Field>
            </Section>

            {/* ---------- 2 · CATEGORIA ---------- */}
            <Section num="2" title="Categoria" sub="Define ícone, filtro e silhueta no anúncio.">
              <div className="cf-chips">
                {CATS.map(c => (
                  <button
                    type="button"
                    key={c}
                    className={`cf-chip ${form.category === c ? 'is-on' : ''}`}
                    onClick={() => set('category', c)}
                  >
                    {LABELS.category[c]}
                  </button>
                ))}
              </div>
            </Section>

            {/* ---------- 3 · ESPECIFICAÇÕES ---------- */}
            <Section num="3" title="Especificações" sub="Dados técnicos exibidos na ficha.">
              <div className="cf-grid cf-grid--2">
                <Field label="Combustível" required>
                  <Select
                    value={form.fuel}
                    onChange={v => set('fuel', v as Fuel)}
                    options={FUELS.map(f => ({ value: f, label: LABELS.fuel[f] }))}
                  />
                </Field>
                <Field label="Câmbio" required>
                  <Select
                    value={form.transmission}
                    onChange={v => set('transmission', v as Transmission)}
                    options={TRANS.map(t => ({ value: t, label: LABELS.transmission[t] }))}
                  />
                </Field>
              </div>

              <div className="cf-grid cf-grid--3">
                <Field label="Lugares" required>
                  <InputGroup suffix="pessoas">
                    <input
                      className="cf-input"
                      type="number" min={2} max={9}
                      value={form.seats}
                      onChange={e => set('seats', e.target.value === '' ? '' : Number(e.target.value))}
                      required
                    />
                  </InputGroup>
                </Field>
                <Field label="Autonomia">
                  <InputGroup suffix="km">
                    <input
                      className="cf-input"
                      type="number"
                      value={form.range_km}
                      onChange={e => set('range_km', e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="ex: 800"
                    />
                  </InputGroup>
                </Field>
                <Field label="Potência">
                  <InputGroup suffix="cv">
                    <input
                      className="cf-input"
                      type="number"
                      value={form.power_hp}
                      onChange={e => set('power_hp', e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="ex: 150"
                    />
                  </InputGroup>
                </Field>
              </div>
            </Section>

            {/* ---------- 4 · OPERAÇÃO ---------- */}
            <Section num="4" title="Operação" sub="Onde fica e em quanto tempo entrega.">
              <div className="cf-grid cf-grid--2">
                <Field label="Hub de entrega" required>
                  <Select
                    value={form.hub}
                    onChange={v => set('hub', v as Hub)}
                    options={HUBS.map(h => ({ value: h, label: LABELS.hub[h] }))}
                  />
                </Field>
                <Field label="Tempo de entrega">
                  <InputGroup suffix="horas">
                    <input
                      className="cf-input"
                      type="number"
                      value={form.delivery_hours}
                      onChange={e => set('delivery_hours', e.target.value === '' ? '' : Number(e.target.value))}
                    />
                  </InputGroup>
                </Field>
              </div>
            </Section>

            {/* ---------- 5 · COMERCIAL ---------- */}
            <Section
              num="5"
              title="Preços por prazo"
              sub="Você define quanto cobra por mês em cada plano. Definir 1 mês também serve como referência da mensalidade base do anúncio."
            >
              <div className="cf-grid cf-grid--2">
                {TERMS.map(t => (
                  <Field
                    key={t}
                    label={`${t} ${t === '1' ? 'mês' : 'meses'}`}
                    required
                    hint={t === '1'
                      ? 'mensalidade cheia (sem fidelidade)'
                      : `mensalidade reduzida pra plano de ${t} meses`}
                  >
                    <InputGroup suffix="R$/mês">
                      <input
                        className="cf-input"
                        type="number" min={0}
                        value={form.term_prices[t]}
                        onChange={e => setTermPrice(t, e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder={t === '1' ? '2890' : ''}
                        required
                      />
                    </InputGroup>
                  </Field>
                ))}
              </div>
              <div className="cf-grid cf-grid--2">
                <Field label="Mensalidade base (display)" hint="Aparece no card da frota — geralmente igual a 1 mês.">
                  <InputGroup suffix="R$/mês">
                    <input
                      className="cf-input"
                      type="number" min={0}
                      value={form.price_month}
                      onChange={e => set('price_month', e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="2890"
                      required
                    />
                  </InputGroup>
                </Field>
                <Field label="Estoque" required hint="Quantas unidades simultâneas estão disponíveis.">
                  <InputGroup suffix="unidades">
                    <input
                      className="cf-input"
                      type="number" min={1}
                      value={form.stock}
                      onChange={e => set('stock', e.target.value === '' ? '' : Number(e.target.value))}
                      required
                    />
                  </InputGroup>
                </Field>
              </div>
            </Section>

            {/* ---------- 6 · FRANQUIAS ---------- */}
            <Section
              num="6"
              title="Franquias mensais"
              sub="Defina os limites de quilometragem que você aceita oferecer e o adicional mensal de cada um. Pelo menos 1 obrigatório. Use “livre” para km ilimitado."
            >
              <div className="km-rows">
                {form.km_options.map((row, i) => {
                  const isLivre = row.value === 'livre';
                  return (
                    <div key={i} className="km-row-edit">
                      <Field label={`Opção ${i + 1}`}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <button
                            type="button"
                            className={`cf-chip ${isLivre ? 'is-on' : ''}`}
                            onClick={() => setKmRow(i, { value: isLivre ? '' : 'livre' })}
                            style={{ flexShrink: 0 }}
                          >
                            ∞ Livre
                          </button>
                          <InputGroup suffix="km/mês">
                            <input
                              className="cf-input"
                              type="number" min={50}
                              value={isLivre ? '' : row.value}
                              disabled={isLivre}
                              placeholder={isLivre ? '—' : 'ex: 1500'}
                              onChange={e => setKmRow(i, { value: e.target.value })}
                            />
                          </InputGroup>
                        </div>
                      </Field>
                      <Field label="Adicional mensal" hint="0 = incluso na mensalidade base">
                        <InputGroup suffix="R$/mês">
                          <input
                            className="cf-input"
                            type="number" min={0}
                            value={row.surcharge}
                            onChange={e => setKmRow(i, {
                              surcharge: e.target.value === '' ? '' : Number(e.target.value),
                            })}
                          />
                        </InputGroup>
                      </Field>
                      <button
                        type="button"
                        className="km-row-edit__rm"
                        onClick={() => removeKmRow(i)}
                        disabled={form.km_options.length <= 1}
                        title={form.km_options.length <= 1 ? 'Mínimo 1 franquia' : 'Remover'}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="btn"
                onClick={addKmRow}
                style={{ marginTop: 6 }}
              >
                + Adicionar franquia
              </button>
            </Section>

            {err && <div className="cf-msg cf-msg--err">{err}</div>}
          </div>

          {/* ============== ASIDE ============== */}
          <aside className="cf-aside">
            <div className="cf-preview">
              <div className="cf-preview__eb">PRÉ-VISUALIZAÇÃO</div>
              <div className="cf-preview__title">
                {form.brand || <span className="muted">Marca</span>}{' '}
                <span style={{ fontStyle: 'italic' }}>
                  {form.model || <span className="muted">modelo</span>}
                </span>
              </div>
              <div className="cf-preview__sub">
                {LABELS.category[form.category]} · {form.year || '—'} · {LABELS.fuel[form.fuel]}
              </div>
              <div className="cf-preview__stage">
                <CarSilhouette category={form.category} />
              </div>
              <div className="cf-preview__price">
                <span className="cur">R$</span>
                {form.price_month === '' ? '—' : fmt.int(Number(form.price_month))}
                <span className="per">/mês</span>
              </div>
              <div className="cf-preview__slug">
                /car?slug=<strong>{previewSlug || '...'}</strong>
              </div>
            </div>

            <div className="cf-actions">
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar carro'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => navigate('/owner/cars')}
              >
                Cancelar
              </button>
              <div className="cf-actions__hint">
                {editing ? `Editando #${id}` : 'Novo cadastro'}
              </div>
            </div>
          </aside>
        </form>
      )}
    </OwnerLayout>
  );
}

/* ============== Componentes auxiliares ============== */

function Section({
  num, title, sub, children,
}: { num: string; title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="cf-section">
      <header className="cf-section__head">
        <div className="cf-section__num">{num}</div>
        <div>
          <div className="cf-section__title">{title}</div>
          {sub && <div className="cf-section__sub">{sub}</div>}
        </div>
      </header>
      <div className="cf-section__body">{children}</div>
    </section>
  );
}

function Field({
  label, hint, required, children,
}: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="cf-field">
      <span className="cf-field__label">
        {label}
        {required && <span className="req">*</span>}
      </span>
      {children}
      {hint && <span className="cf-field__hint">{hint}</span>}
    </label>
  );
}

function InputGroup({ suffix, children }: { suffix: string; children: ReactNode }) {
  return (
    <div className="cf-input-group">
      {children}
      <span className="cf-input-group__suffix">{suffix}</span>
    </div>
  );
}
