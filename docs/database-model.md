users        (id, telegram_id UNIQUE, name, created_at)
drafts       (id, user_id, raw_text, parsed_json, status, created_at)  -- rascunho aguardando confirmação
transactions (id, user_id, type, amount_cents, date, category, description, raw_text, created_at)
login_tokens (token, user_id, expires_at)