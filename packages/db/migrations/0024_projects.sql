-- プロジェクト（案件）管理。顧客の配下にプロジェクトを持ち、帳票（請求・見積・支払系）を紐づける。
-- プロジェクト粗利 = 紐づく請求(invoice)合計 − 支払(order/payment_notice)合計。
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client_id TEXT NOT NULL,          -- 顧客（発注元）
  issuer_id TEXT,                   -- 自社（どの会社の案件か・複数社運用）
  division_id TEXT,                 -- 計上区分（部門）
  detail TEXT,                      -- 案件詳細メモ
  status TEXT NOT NULL DEFAULT 'active',  -- active(進行中) | done(完了)
  start_date TEXT,                  -- 開始日 YYYY-MM-DD
  end_date TEXT,                    -- 完了日 YYYY-MM-DD
  person TEXT,                      -- 担当者名
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);

-- 帳票をプロジェクトに紐づける（NULL=未割当。既存帳票はそのまま動く）
ALTER TABLE documents ADD COLUMN project_id TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
