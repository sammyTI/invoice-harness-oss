-- 「はじめにやること」チェックリストを手動で閉じた状態（メンバーごと・端末を跨いで永続）
ALTER TABLE members ADD COLUMN checklist_dismissed INTEGER NOT NULL DEFAULT 0;
