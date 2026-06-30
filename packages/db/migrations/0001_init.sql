-- invoice-harness-oss / initial schema (D1 / SQLite)

CREATE TABLE IF NOT EXISTS issuers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  registration_number TEXT,            -- 適格請求書発行事業者 登録番号 (T + 13桁)
  postal_code TEXT,
  address TEXT,
  tel TEXT,
  email TEXT,
  bank_info TEXT,                       -- 振込先
  logo_key TEXT,                        -- R2 object key
  seal_key TEXT,                        -- R2 object key
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  honorific TEXT NOT NULL DEFAULT '御中',
  contact TEXT,
  postal_code TEXT,
  address TEXT,
  email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit_price INTEGER NOT NULL DEFAULT 0,
  tax_rate INTEGER NOT NULL DEFAULT 10,
  unit TEXT NOT NULL DEFAULT '式',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                   -- estimate/order/invoice/receipt/payment_notice
  number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft/issued/sent/paid/canceled
  issuer_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  due_date TEXT,
  subject TEXT,
  notes TEXT,
  rounding TEXT NOT NULL DEFAULT 'floor',
  parent_id TEXT,
  subtotal INTEGER NOT NULL DEFAULT 0,
  tax_total INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (issuer_id) REFERENCES issuers(id),
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (parent_id) REFERENCES documents(id)
);

CREATE TABLE IF NOT EXISTS document_lines (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  description TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT '式',
  unit_price INTEGER NOT NULL DEFAULT 0,
  tax_rate INTEGER NOT NULL DEFAULT 10,
  amount INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  paid_date TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  method TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sequences (
  key TEXT PRIMARY KEY,                 -- e.g. invoice-2026
  value INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(type);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_lines_document ON document_lines(document_id);
CREATE INDEX IF NOT EXISTS idx_payments_document ON payments(document_id);
