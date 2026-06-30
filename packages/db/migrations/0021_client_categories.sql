-- 顧客区分（取引先のタグ）。マスタに複数登録でき、1つの取引先に複数の区分を付与できる（多対多）。
CREATE TABLE IF NOT EXISTS client_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS client_category_links (
  client_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  PRIMARY KEY (client_id, category_id),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES client_categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ccl_client ON client_category_links(client_id);
CREATE INDEX IF NOT EXISTS idx_ccl_category ON client_category_links(category_id);
