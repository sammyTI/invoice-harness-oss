-- 招待メールの既定文面を v2（招待者名・会社名入り）に更新
-- ユーザーが編集済みの行は壊さないため、0029 のシード時の subject/body と
-- 完全一致する行だけを対象にする（key='invite' かつ 0029 の初期文面のまま）
UPDATE email_templates
SET subject = '【{company}】{inviter} さんからログイン情報のご案内',
    body = '{name} 様

{company} の {inviter} さんから、請求書管理ツール（Invoice Harness）への招待が届きました。
下記のログイン情報でログインしてください。

メールアドレス: {email}
初期パスワード: {password}

{link}

初回ログイン後にパスワードの変更をお願いします。'
WHERE key = 'invite'
  AND subject = '【Invoice Harness】ログイン情報のご案内'
  AND body = '{name} 様

Invoice Harness のログイン情報をご案内します。下記からログインしてください。

メールアドレス: {email}
初期パスワード: {password}

{link}

初回ログイン後にパスワードの変更をお願いします。';
