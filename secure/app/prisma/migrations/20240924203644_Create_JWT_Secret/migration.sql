CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "JWTSecret" (id, secret)
VALUES (1, encode(gen_random_bytes(128), 'base64'))
ON CONFLICT (id)
  DO NOTHING;
