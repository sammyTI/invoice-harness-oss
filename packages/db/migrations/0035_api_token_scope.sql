-- APIトークンの権限スコープ。full=全操作 / readonly=参照のみ。既存トークンは互換のためfull
ALTER TABLE api_tokens ADD COLUMN scope TEXT NOT NULL DEFAULT 'full'; -- full | readonly
