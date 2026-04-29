-- =============================================================================
-- CarShare — schema + seed inicial
-- =============================================================================
-- Como aplicar:
--   1) Via Supabase Dashboard:  SQL Editor → New query → cole este arquivo → Run
--   2) Via backend:             `npm start` roda isso automaticamente no boot
--
-- Idempotente: pode ser executado quantas vezes quiser sem quebrar nada.
-- =============================================================================


-- ================ ENUM DE ROLES =================
-- Wrapped em DO / EXCEPTION porque `CREATE TYPE` não aceita `IF NOT EXISTS`.
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'cliente', 'proprietario');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ================ TABELAS =================
CREATE TABLE IF NOT EXISTS users (
  id           BIGSERIAL    PRIMARY KEY,
  name         TEXT         NOT NULL,
  email        TEXT         UNIQUE NOT NULL,
  password     TEXT         NOT NULL,          -- bcrypt hash
  role         user_role    NOT NULL DEFAULT 'cliente',
  phone        TEXT,
  cpf          TEXT,
  cnh          TEXT,
  birthdate    DATE,
  status       TEXT         NOT NULL DEFAULT 'active',  -- active | suspended | banned
  status_reason TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- Migracao: garante a coluna `status` em bancos antigos (boot idempotente).
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_reason TEXT;

CREATE TABLE IF NOT EXISTS cars (
  id              BIGSERIAL    PRIMARY KEY,
  slug            TEXT         UNIQUE NOT NULL,
  owner_id        BIGINT       REFERENCES users(id) ON DELETE SET NULL,   -- NULL = frota da plataforma
  brand           TEXT         NOT NULL,
  model           TEXT         NOT NULL,
  year            INTEGER      NOT NULL,
  category        TEXT         NOT NULL,       -- urbano | seda | suv | pickup | eletrico | luxo
  fuel            TEXT         NOT NULL,       -- flex | hibrido | eletrico | diesel
  transmission    TEXT         NOT NULL,       -- automatico | cvt | manual
  seats           INTEGER      NOT NULL,
  range_km        INTEGER,
  power_hp        INTEGER,
  delivery_hours  INTEGER,
  hub             TEXT         NOT NULL,       -- sao-paulo | rio | bh | curitiba | poa
  price_month     INTEGER      NOT NULL,
  badge           TEXT,                        -- new | popular | ev
  description     TEXT,
  stock           INTEGER      NOT NULL DEFAULT 1,
  -- Franquias mensais oferecidas pelo proprietario.
  -- Array de objetos { value, surcharge } onde value = '1500'|'2500'|'5000'|'livre'|qualquer km
  -- e surcharge = adicional mensal em R$. Pelo menos 1 opcao obrigatoria.
  km_options      JSONB        NOT NULL DEFAULT '[
    {"value":"1500","surcharge":0},
    {"value":"2500","surcharge":180},
    {"value":"livre","surcharge":420}
  ]'::jsonb,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- Migracao idempotente para bancos antigos.
ALTER TABLE cars ADD COLUMN IF NOT EXISTS km_options JSONB NOT NULL DEFAULT '[
  {"value":"1500","surcharge":0},
  {"value":"2500","surcharge":180},
  {"value":"livre","surcharge":420}
]'::jsonb;

-- Adiciona term_prices nullable AGORA. O preenchimento (UPDATE) e o NOT NULL
-- ficam pra DEPOIS do seed INSERT — senao os INSERTs do seed quebrariam por
-- nao informar term_prices em uma coluna NOT NULL sem default util.
ALTER TABLE cars ADD COLUMN IF NOT EXISTS term_prices JSONB;
-- Bancos em estado intermediario (migracao anterior aplicou SET NOT NULL
-- ANTES do seed) precisam relaxar a constraint pra os INSERTs passarem.
-- Idempotente: em coluna ja nullable o DROP NOT NULL eh no-op.
ALTER TABLE cars ALTER COLUMN term_prices DROP NOT NULL;

CREATE TABLE IF NOT EXISTS bookings (
  id              BIGSERIAL    PRIMARY KEY,
  code            TEXT         UNIQUE NOT NULL,           -- CS-XXXXX
  user_id         BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  car_id          BIGINT       NOT NULL REFERENCES cars(id),
  term_months     INTEGER      NOT NULL,                  -- 1 | 3 | 6 | 12
  km_limit        TEXT         NOT NULL,                  -- 1500 | 2500 | livre
  extras          JSONB        NOT NULL DEFAULT '[]'::jsonb,
  start_date      DATE         NOT NULL,
  end_date        DATE         NOT NULL,
  monthly_price   INTEGER      NOT NULL,
  total_price     INTEGER      NOT NULL,
  delivery_addr   TEXT,
  delivery_when   TEXT,                                   -- hoje_24h | amanha_48h | agendar
  payment_method  TEXT,                                   -- card | pix | boleto
  status          TEXT         NOT NULL DEFAULT 'scheduled',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Workflow de entrega + cancelamento (idempotente em bancos antigos).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivered_at          TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at          TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_by          BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_fee      INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason   TEXT;

CREATE TABLE IF NOT EXISTS invoices (
  id          BIGSERIAL     PRIMARY KEY,
  booking_id  BIGINT        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount      INTEGER       NOT NULL,
  due_date    DATE          NOT NULL,
  paid        BOOLEAN       NOT NULL DEFAULT FALSE,
  paid_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  car_id     BIGINT       NOT NULL REFERENCES cars(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, car_id)
);

-- Chat 1:1 entre cliente e proprietario, ancorado em uma reserva.
-- A thread só existe se houver booking entre as duas partes.
CREATE TABLE IF NOT EXISTS messages (
  id          BIGSERIAL    PRIMARY KEY,
  booking_id  BIGINT       NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id   BIGINT       NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  body        TEXT         NOT NULL,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Comentarios publicos no anuncio do carro (qualquer usuario logado).
CREATE TABLE IF NOT EXISTS car_comments (
  id          BIGSERIAL    PRIMARY KEY,
  car_id      BIGINT       NOT NULL REFERENCES cars(id)  ON DELETE CASCADE,
  user_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body        TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Audit log de toda acao administrativa.
-- Imutavel: nunca atualiza/delete linhas, so insert + select.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id            BIGSERIAL    PRIMARY KEY,
  admin_id      BIGINT       NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  admin_email   TEXT         NOT NULL,
  action        TEXT         NOT NULL,    -- ex: 'user.update', 'booking.cancel', 'login'
  target_entity TEXT,                     -- ex: 'user', 'booking', 'car', 'invoice', 'comment'
  target_id     BIGINT,
  payload       JSONB        NOT NULL DEFAULT '{}'::jsonb,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Feedbacks de perfil: avaliacao + texto deixado por outro usuario.
-- Permite cliente avaliar proprietario e vice-versa apos uma reserva.
CREATE TABLE IF NOT EXISTS profile_reviews (
  id          BIGSERIAL    PRIMARY KEY,
  target_id   BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id   BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body        TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (target_id, author_id)
);


-- ================ ÍNDICES =================
CREATE INDEX IF NOT EXISTS idx_cars_category     ON cars(category);
CREATE INDEX IF NOT EXISTS idx_cars_hub          ON cars(hub);
CREATE INDEX IF NOT EXISTS idx_cars_owner        ON cars(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user     ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_car      ON bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking  ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking  ON messages(booking_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_carcomments_car   ON car_comments(car_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_target    ON profile_reviews(target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_admin       ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity      ON admin_audit_log(target_entity, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_created     ON admin_audit_log(created_at DESC);


-- ================ SEED DA FROTA (18 carros) =================
-- owner_id = 2 → todos os carros do seed pertencem ao usuario id=2.
-- ON CONFLICT (slug) DO NOTHING → roda de novo sem duplicar.
INSERT INTO cars
  (slug, owner_id, brand, model, year, category, fuel, transmission, seats, range_km, power_hp, delivery_hours, hub, price_month, badge, description, stock)
VALUES
  ('fiat-pulse-2025',        2, 'Fiat',       'Pulse Impetus',                 2025, 'urbano',   'flex',     'cvt',        5, 620,  130, 48, 'sao-paulo', 1890, 'new',     'Urbano eficiente, turbo 1.0, ideal para rodar na cidade com consumo econômico.', 5),
  ('vw-polo-track',          2, 'Volkswagen', 'Polo Track',                    2024, 'urbano',   'flex',     'manual',     5, 680,   84, 48, 'sao-paulo', 1990, NULL,      'O hatch mais vendido do Brasil, simples e confiável.', 5),
  ('hyundai-hb20',           2, 'Hyundai',    'HB20 Comfort',                  2024, 'urbano',   'flex',     'automatico', 5, 640,  116, 72, 'rio',       2090, 'popular', 'Espaço interno, baixo consumo e direção leve.', 5),

  ('honda-civic',            2, 'Honda',      'Civic Touring',                 2025, 'seda',     'hibrido',  'cvt',        5, 900,  204, 48, 'sao-paulo', 3290, 'popular', 'Sedã híbrido, autonomia gigante e conforto de viagem.', 5),
  ('toyota-corolla',         2, 'Toyota',     'Corolla XEi',                   2024, 'seda',     'hibrido',  'cvt',        5, 920,  122, 48, 'sao-paulo', 2890, NULL,      'Sedã referência, manutenção barata e consumo baixíssimo.', 5),
  ('chevrolet-onix',         2, 'Chevrolet',  'Onix Plus',                     2024, 'seda',     'flex',     'automatico', 5, 600,  116, 72, 'bh',        2490, NULL,      'Sedã compacto, direção leve e ótimo custo-benefício.', 5),

  ('jeep-compass',           2, 'Jeep',       'Compass Longitude',             2024, 'suv',      'flex',     'automatico', 5, 720,  185, 48, 'sao-paulo', 3590, 'popular', 'SUV robusto, 4x2, interior confortável e câmbio de 9 marchas.', 5),
  ('vw-tcross',              2, 'Volkswagen', 'T-Cross Highline',              2025, 'suv',      'flex',     'automatico', 5, 700,  150, 48, 'rio',       3190, 'new',     'SUV compacto com porta-malas gigante e tecnologia VW.', 5),
  ('toyota-corolla-cross',   2, 'Toyota',     'Corolla Cross XRE',             2025, 'suv',      'hibrido',  'cvt',        5, 950,  122, 48, 'curitiba',  3890, NULL,      'SUV híbrido flex, eficiência japonesa e baixíssimo custo por km.', 5),

  ('toyota-hilux',           2, 'Toyota',     'Hilux SRX',                     2024, 'pickup',   'diesel',   'automatico', 5, 1100, 204, 72, 'sao-paulo', 4690, 'popular', 'Pickup 4x4, indestrutível, ideal para off-road e carga pesada.', 5),
  ('ford-ranger',            2, 'Ford',       'Ranger XLS',                    2025, 'pickup',   'diesel',   'automatico', 5, 1050, 170, 72, 'poa',       4390, 'new',     'Pickup média com suspensão refinada e bom acabamento.', 5),
  ('fiat-toro',              2, 'Fiat',       'Toro Endurance',                2024, 'pickup',   'flex',     'automatico', 5, 760,  166, 48, 'bh',        3690, NULL,      'Pickup flex, uso urbano e leve off-road.', 5),

  ('byd-seal',               2, 'BYD',        'Seal Performance',              2025, 'eletrico', 'eletrico', 'automatico', 5, 580,  530, 72, 'sao-paulo', 4590, 'ev',      'Sedã elétrico de alto desempenho, 0-100 em 3,8s.', 5),
  ('volvo-xc40-recharge',    2, 'Volvo',      'XC40 Recharge Pure',            2025, 'eletrico', 'eletrico', 'automatico', 5, 455,  408, 48, 'sao-paulo', 4990, 'ev',      'SUV elétrico compacto, luxo escandinavo e desempenho.', 5),
  ('gwm-ora-03',             2, 'GWM',        'Ora 03 Skin',                   2024, 'eletrico', 'eletrico', 'automatico', 5, 400,  171, 72, 'rio',       3990, 'ev',      'Compacto elétrico estiloso, ótimo para uso urbano.', 5),

  ('volvo-xc60-recharge',    2, 'Volvo',      'XC60 Recharge Ultimate T8',     2025, 'luxo',     'hibrido',  'automatico', 5, 650,  455, 48, 'sao-paulo', 5890, 'popular', 'SUV híbrido plug-in, acabamento premium, sound Bowers & Wilkins e teto panorâmico.', 5),
  ('bmw-320i',               2, 'BMW',        '320i M Sport',                  2024, 'luxo',     'flex',     'automatico', 5, 680,  184, 48, 'sao-paulo', 6290, NULL,      'Sedã premium alemão, direção esportiva e conforto.', 5),
  ('audi-q3',                2, 'Audi',       'Q3 Performance Black',          2025, 'luxo',     'flex',     'automatico', 5, 650,  230, 48, 'sao-paulo', 6690, 'new',     'SUV compacto premium, interior refinado e pacote Black.', 5)
ON CONFLICT (slug) DO NOTHING;

-- Garante que carros ja existentes (incluindo os do seed antigo com NULL) fiquem
-- vinculados ao proprietario id=2. Roda em todo boot, idempotente.
UPDATE cars SET owner_id = 2
  WHERE slug IN (
    'fiat-pulse-2025','vw-polo-track','hyundai-hb20',
    'honda-civic','toyota-corolla','chevrolet-onix',
    'jeep-compass','vw-tcross','toyota-corolla-cross',
    'toyota-hilux','ford-ranger','fiat-toro',
    'byd-seal','volvo-xc40-recharge','gwm-ora-03',
    'volvo-xc60-recharge','bmw-320i','audi-q3'
  )
  AND owner_id IS DISTINCT FROM 2;

-- ================ POPULA term_prices E APLICA NOT NULL ================
-- Roda APOS o seed pra evitar quebra de INSERTs sem term_prices.
-- Para cada carro com term_prices NULL, deriva do price_month usando os
-- descontos historicos como ponto de partida — owner pode editar depois.
UPDATE cars SET term_prices = jsonb_build_object(
  '1',  price_month,
  '3',  ROUND(price_month * 0.95)::int,
  '6',  ROUND(price_month * 0.92)::int,
  '12', ROUND(price_month * 0.88)::int
) WHERE term_prices IS NULL;
ALTER TABLE cars ALTER COLUMN term_prices SET NOT NULL;


-- =============================================================================
-- Observação sobre Row Level Security (RLS):
--
-- As tabelas acima não têm RLS habilitada. Isso é seguro porque o backend
-- conecta como o usuário `postgres` (DATABASE_URL), que bypassa RLS.
--
-- Se você for expor esses dados via PostgREST com a chave anon no frontend,
-- precisa: (1) `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY`, (2) criar policies.
-- Enquanto tudo passar pelo nosso Node + JWT próprio, não é necessário.
-- =============================================================================
