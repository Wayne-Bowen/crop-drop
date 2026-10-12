-- CropDrop schema (PostgreSQL). Five core tables from the ER diagram, plus a small messages table for the contact form.
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  password_hash VARCHAR(100) NOT NULL,
  phone         VARCHAR(20)  NOT NULL,
  role          VARCHAR(10)  NOT NULL CHECK (role IN ('farmer','buyer','admin')),
  status        VARCHAR(10)  NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved')),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS categories (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS produce (
  id          SERIAL PRIMARY KEY,
  farmer_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(600) NOT NULL DEFAULT '',
  price       NUMERIC(10,2) NOT NULL CHECK (price > 0),
  quantity    INTEGER NOT NULL CHECK (quantity >= 0),
  photo       VARCHAR(255),
  location    VARCHAR(100) NOT NULL,
  status      VARCHAR(10) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id         SERIAL PRIMARY KEY,
  buyer_id   INTEGER NOT NULL REFERENCES users(id),
  total      NUMERIC(12,2) NOT NULL,
  status     VARCHAR(12) NOT NULL DEFAULT 'placed' CHECK (status IN ('placed','confirmed','dispatched','delivered')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  produce_id INTEGER NOT NULL REFERENCES produce(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL,
  message    VARCHAR(1000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_produce_status ON produce (status, category_id);
CREATE INDEX IF NOT EXISTS idx_produce_farmer ON produce (farmer_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer   ON orders (buyer_id);
CREATE INDEX IF NOT EXISTS idx_items_order    ON order_items (order_id);
