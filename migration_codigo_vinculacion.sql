-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna codigo_vinculacion a alumnas
ALTER TABLE alumnas ADD COLUMN IF NOT EXISTS codigo_vinculacion TEXT UNIQUE;

-- 2. Generar códigos para alumnas existentes sin código
DO $$
DECLARE
  r RECORD;
  nuevo_codigo TEXT;
  chars TEXT := 'BCDFGHJKLMNPQRSTVWXYZ23456789';
  i INTEGER;
  intentos INTEGER;
BEGIN
  FOR r IN SELECT id FROM alumnas WHERE codigo_vinculacion IS NULL LOOP
    intentos := 0;
    LOOP
      -- Generar código SD-XXXXX (5 chars aleatorios)
      nuevo_codigo := 'SD-';
      FOR i IN 1..5 LOOP
        nuevo_codigo := nuevo_codigo || substr(chars, floor(random() * length(chars) + 1)::int, 1);
      END LOOP;
      -- Intentar insertar; si hay colisión, reintentar
      BEGIN
        UPDATE alumnas SET codigo_vinculacion = nuevo_codigo WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        intentos := intentos + 1;
        IF intentos > 10 THEN RAISE EXCEPTION 'No se pudo generar código único'; END IF;
      END;
    END LOOP;
  END LOOP;
END $$;

-- 3. RLS: familias pueden leer su propio código (para mostrarlo en perfil si fuera necesario)
-- Las alumnas sin familia_id son alumnas "sin reclamar" — solo el admin las ve

-- Verificar resultado
SELECT nombre, codigo_vinculacion FROM alumnas ORDER BY nombre LIMIT 20;
