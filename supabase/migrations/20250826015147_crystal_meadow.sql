/*
  # Schema completo para CarShare - Sistema de Aluguel de Carros

  1. Novas Tabelas
    - `profiles` - Perfis dos usuários (complementa auth.users)
    - `cars` - Veículos cadastrados
    - `bookings` - Reservas de veículos
    - `reviews` - Avaliações dos carros
    - `favorites` - Carros favoritos dos usuários
    - `messages` - Sistema de mensagens entre usuários
    - `payments` - Histórico de pagamentos
    - `car_images` - Imagens dos veículos
    - `notifications` - Notificações do sistema

  2. Segurança
    - RLS habilitado em todas as tabelas
    - Políticas específicas para cada tipo de usuário
    - Proteção de dados sensíveis

  3. Funcionalidades
    - Sistema completo de autenticação
    - Gestão de anúncios de carros
    - Sistema de reservas
    - Avaliações e favoritos
    - Mensagens entre usuários
    - Histórico de pagamentos
*/

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE user_role AS ENUM ('renter', 'owner');
CREATE TYPE car_category AS ENUM ('economy', 'compact', 'suv', 'luxury', 'sports', 'minivan', 'convertible');
CREATE TYPE transmission_type AS ENUM ('automatic', 'manual');
CREATE TYPE fuel_type AS ENUM ('gasoline', 'diesel', 'electric', 'hybrid');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
CREATE TYPE notification_type AS ENUM ('booking', 'payment', 'review', 'message', 'system');

-- Tabela de perfis dos usuários (complementa auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role user_role NOT NULL DEFAULT 'renter',
  avatar_url text,
  phone text,
  bio text,
  location text,
  date_of_birth date,
  driver_license text,
  is_verified boolean DEFAULT false,
  rating numeric(3,2) DEFAULT 0,
  review_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de carros
CREATE TABLE IF NOT EXISTS cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL CHECK (year >= 1990 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
  price_per_day numeric(10,2) NOT NULL CHECK (price_per_day > 0),
  location text NOT NULL,
  description text NOT NULL,
  category car_category NOT NULL DEFAULT 'economy',
  transmission transmission_type NOT NULL DEFAULT 'automatic',
  fuel_type fuel_type NOT NULL DEFAULT 'gasoline',
  seats integer NOT NULL CHECK (seats >= 2 AND seats <= 9),
  mileage integer,
  license_plate text,
  color text,
  features text[] DEFAULT '{}',
  rules text[] DEFAULT '{}',
  available boolean DEFAULT true,
  is_active boolean DEFAULT true,
  rating numeric(3,2) DEFAULT 0,
  review_count integer DEFAULT 0,
  total_bookings integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de imagens dos carros
CREATE TABLE IF NOT EXISTS car_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  is_primary boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Tabela de reservas
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  renter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  pickup_location text,
  return_location text,
  total_days integer NOT NULL CHECK (total_days > 0),
  price_per_day numeric(10,2) NOT NULL,
  service_fee numeric(10,2) DEFAULT 50,
  total_price numeric(10,2) NOT NULL,
  status booking_status DEFAULT 'pending',
  special_requests text,
  cancellation_reason text,
  cancelled_at timestamptz,
  confirmed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT valid_dates CHECK (end_date >= start_date),
  CONSTRAINT no_self_booking CHECK (renter_id != owner_id)
);

-- Tabela de avaliações
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  car_id uuid NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  is_car_review boolean DEFAULT true,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(booking_id, reviewer_id, is_car_review)
);

-- Tabela de favoritos
CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  car_id uuid NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, car_id)
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT no_self_message CHECK (sender_id != receiver_id)
);

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  service_fee numeric(10,2) DEFAULT 0,
  net_amount numeric(10,2) NOT NULL,
  payment_method text,
  payment_provider text,
  provider_payment_id text,
  status payment_status DEFAULT 'pending',
  paid_at timestamptz,
  refunded_at timestamptz,
  refund_amount numeric(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cars_owner_id ON cars(owner_id);
CREATE INDEX IF NOT EXISTS idx_cars_location ON cars(location);
CREATE INDEX IF NOT EXISTS idx_cars_category ON cars(category);
CREATE INDEX IF NOT EXISTS idx_cars_price ON cars(price_per_day);
CREATE INDEX IF NOT EXISTS idx_cars_available ON cars(available, is_active);
CREATE INDEX IF NOT EXISTS idx_cars_rating ON cars(rating DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_car_id ON bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_bookings_renter_id ON bookings(renter_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner_id ON bookings(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

CREATE INDEX IF NOT EXISTS idx_reviews_car_id ON reviews(car_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON messages(booking_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON cars FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar rating dos carros
CREATE OR REPLACE FUNCTION update_car_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cars 
  SET 
    rating = (
      SELECT COALESCE(AVG(rating::numeric), 0)
      FROM reviews 
      WHERE car_id = COALESCE(NEW.car_id, OLD.car_id) AND is_car_review = true
    ),
    review_count = (
      SELECT COUNT(*)
      FROM reviews 
      WHERE car_id = COALESCE(NEW.car_id, OLD.car_id) AND is_car_review = true
    )
  WHERE id = COALESCE(NEW.car_id, OLD.car_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_car_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_car_rating();

-- Função para atualizar rating dos usuários
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET 
    rating = (
      SELECT COALESCE(AVG(rating::numeric), 0)
      FROM reviews 
      WHERE reviewed_user_id = COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id) AND is_car_review = false
    ),
    review_count = (
      SELECT COUNT(*)
      FROM reviews 
      WHERE reviewed_user_id = COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id) AND is_car_review = false
    )
  WHERE id = COALESCE(NEW.reviewed_user_id, OLD.reviewed_user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_user_rating();

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para profiles
CREATE POLICY "Usuários podem ver perfis públicos"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem inserir próprio perfil"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Políticas RLS para cars
CREATE POLICY "Todos podem ver carros ativos"
  ON cars FOR SELECT
  TO authenticated
  USING (is_active = true AND available = true);

CREATE POLICY "Proprietários podem ver seus carros"
  ON cars FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Proprietários podem inserir carros"
  ON cars FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Proprietários podem atualizar seus carros"
  ON cars FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Proprietários podem deletar seus carros"
  ON cars FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Políticas RLS para car_images
CREATE POLICY "Todos podem ver imagens de carros ativos"
  ON car_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cars 
      WHERE cars.id = car_images.car_id 
      AND (cars.is_active = true OR cars.owner_id = auth.uid())
    )
  );

CREATE POLICY "Proprietários podem gerenciar imagens"
  ON car_images FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cars 
      WHERE cars.id = car_images.car_id 
      AND cars.owner_id = auth.uid()
    )
  );

-- Políticas RLS para bookings
CREATE POLICY "Usuários podem ver suas reservas"
  ON bookings FOR SELECT
  TO authenticated
  USING (auth.uid() = renter_id OR auth.uid() = owner_id);

CREATE POLICY "Locatários podem criar reservas"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Participantes podem atualizar reservas"
  ON bookings FOR UPDATE
  TO authenticated
  USING (auth.uid() = renter_id OR auth.uid() = owner_id);

-- Políticas RLS para reviews
CREATE POLICY "Todos podem ver avaliações públicas"
  ON reviews FOR SELECT
  TO authenticated
  USING (is_public = true);

CREATE POLICY "Usuários podem ver avaliações que receberam"
  ON reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = reviewed_user_id);

CREATE POLICY "Usuários podem criar avaliações"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = reviews.booking_id 
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
      AND bookings.status = 'completed'
    )
  );

-- Políticas RLS para favorites
CREATE POLICY "Usuários podem ver seus favoritos"
  ON favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem gerenciar seus favoritos"
  ON favorites FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Políticas RLS para messages
CREATE POLICY "Usuários podem ver suas mensagens"
  ON messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Usuários podem enviar mensagens"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Receptores podem marcar como lida"
  ON messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id);

-- Políticas RLS para payments
CREATE POLICY "Usuários podem ver seus pagamentos"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = payer_id OR auth.uid() = receiver_id);

CREATE POLICY "Sistema pode inserir pagamentos"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = payer_id);

-- Políticas RLS para notifications
CREATE POLICY "Usuários podem ver suas notificações"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Sistema pode criar notificações"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuários podem atualizar suas notificações"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Função para criar perfil automaticamente após registro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'renter')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar perfil automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();