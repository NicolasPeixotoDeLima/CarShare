# CarShare — sistema completo (React + Express + Supabase)

Aplicação full-stack de assinatura mensal de carros.

- **Frontend**: React 18 + TypeScript (Vite). Uma página = um `.tsx` + um `.css`.
- **Backend**: Node.js + Express + Postgres (**Supabase**). Driver `pg`.
- **Auth**: JWT em cookie httpOnly + bcrypt para senhas.
- **Roles**: `admin`, `cliente`, `proprietario`.

## Primeira execução

```bash
npm run install:all                 # instala deps do backend e do client
cp .env.example .env                # crie o .env e preencha DATABASE_URL + JWT_SECRET
npm run build:client                # gera client/dist
npm start                           # → http://localhost:3000
```

Na subida, o servidor:
1. carrega `.env`
2. conecta no Postgres e roda `migrate()` (idempotente — `CREATE TYPE` + `CREATE TABLE IF NOT EXISTS`)
3. chama `seed()` — se a tabela `cars` estiver vazia, insere 18 carros do catálogo inicial com `owner_id = NULL` (frota da plataforma)

### Onde pegar o DATABASE_URL

Supabase dashboard → **Project Settings** → **Database** → **Connection string** → **URI**. Substitua `[YOUR-PASSWORD]` pela senha do banco que você definiu ao criar o projeto. Use a porta **6543** (pooler) para runtime; a 5432 só se for rodar migrations pesadas.

### Como promover alguém a `admin`

No SQL Editor do Supabase:

```sql
UPDATE users SET role = 'admin' WHERE email = 'voce@exemplo.com';
```

Signup pelo frontend só aceita `cliente` ou `proprietario`. O `admin` nunca é atribuído via API, por segurança.

## Roles — o que cada um pode fazer

| Role            | Descrição                                                    |
|-----------------|--------------------------------------------------------------|
| `cliente`       | Assina carros. Pode favoritar, reservar, ver próprio perfil. |
| `proprietario`  | Cadastra carros próprios (POST/PUT/DELETE só nos próprios).  |
| `admin`         | Tudo acima + gerencia qualquer carro da base.                |

## Desenvolvimento

```bash
npm run server:dev      # backend com node --watch, auto-restart
npm run dev:client      # Vite em :5173 com HMR + proxy /api → :3000
```

## Estrutura

```
Projeto/
├── server.js                       # entry; carrega .env, roda migrate+seed, sobe Express
├── package.json                    # pg, dotenv, express, bcryptjs, jsonwebtoken, cookie-parser
├── .env.example                    # copiar para .env e preencher
├── db/
│   ├── index.js                    # pg Pool + helpers (query/one/all/nrun/tx) + migrate()
│   └── seed.js                     # 18 carros iniciais, transacional
├── middleware/
│   └── auth.js                     # signToken/authOptional/authRequired/requireRole(...)
├── routes/
│   ├── auth.js                     # signup (role cliente|proprietario) / login / logout / me
│   ├── cars.js                     # list+filters (público); POST/PUT/DELETE (proprietario|admin)
│   ├── bookings.js                 # create (transacional c/ invoices) + get by code
│   ├── favorites.js                # toggle favorito
│   └── profile.js                  # user + active booking + invoices + bookings + favs
└── client/
    ├── package.json                # react 18, react-router-dom, react-leaflet, leaflet
    ├── vite.config.ts              # proxy /api → :3000
    └── src/
        ├── main.tsx / App.tsx
        ├── styles/                 # variables.css, global.css
        ├── lib/                    # types.ts, api.ts, draft.ts, useAuth.ts, roadGraph.ts
        ├── components/             # Nav, CarSilhouette, LiveMap (Leaflet + carros em ruas OSM)
        └── pages/                  # Home, Fleet, CarDetail, Login, Checkout, Success, Profile, NotFound
```

## Endpoints

| Método | Path                           | Auth / Role             | Descrição                                     |
|--------|--------------------------------|-------------------------|-----------------------------------------------|
| POST   | /api/auth/signup               | –                       | `{name,email,password,phone?,role?}` (role ∈ cliente\|proprietario) |
| POST   | /api/auth/login                | –                       | `{email,password}`                            |
| POST   | /api/auth/logout               | –                       | limpa cookie                                  |
| GET    | /api/auth/me                   | auth                    | usuário corrente (com `role`)                 |
| GET    | /api/cars                      | –                       | filtros: q, category, fuel, transmission, seats, hub, price_min/max, sort, limit, offset, owner=me\|platform\|\<id\> |
| GET    | /api/cars/:idOrSlug            | –                       | detalhe                                       |
| POST   | /api/cars                      | `proprietario`, `admin` | cadastra carro (admin pode definir owner_id)  |
| PUT    | /api/cars/:id                  | owner\|admin            | patch parcial                                 |
| DELETE | /api/cars/:id                  | owner\|admin            | remove                                        |
| POST   | /api/bookings                  | auth                    | cria reserva + N invoices (1 por mês)         |
| GET    | /api/bookings/:code            | auth                    | detalhe + invoices                            |
| POST   | /api/favorites/:carId/toggle   | auth                    | alterna favorito                              |
| GET    | /api/profile                   | auth                    | user + active + invoices + bookings + favs    |
| GET    | /api/health                    | –                       | ping                                          |

## Preços (duplicados entre frontend e backend)

- Desconto por prazo: 1m = 0%, 3m = 5%, 6m = 8%, 12m = 12%
- Franquia km: 1.500 incluso, 2.500 +R$ 180, livre +R$ 420
- Extras: seguro_plus R$ 190 · manutencao_premium R$ 120 · motorista_extra R$ 60 · wallbox R$ 90
- Adesão: isenta
- Ao criar reserva: uma invoice por mês do prazo, tudo dentro de uma transaction

Valores estão em `routes/bookings.js` (autoridade) e replicados em `client/src/lib/api.ts` (`PRICING`) apenas para o cliente pré-calcular o total ao vivo antes de enviar.
