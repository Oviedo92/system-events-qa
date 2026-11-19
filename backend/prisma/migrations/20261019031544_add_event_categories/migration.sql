
CREATE TABLE "EventCategory" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventCategory_name_key"
    ON "EventCategory"("name");

CREATE UNIQUE INDEX "EventCategory_slug_key"
    ON "EventCategory"("slug");

-- Insertar las seis categorías oficiales.
INSERT INTO "EventCategory" ("name", "slug", "description", "updatedAt")
VALUES
    ('Música', 'musica', 'Conciertos y espectáculos musicales.', CURRENT_TIMESTAMP),
    ('Festivales', 'festivales', 'Festivales y ferias culturales o temáticas.', CURRENT_TIMESTAMP),
    ('Deportes', 'deportes', 'Competiciones y actividades deportivas.', CURRENT_TIMESTAMP),
    ('Teatro', 'teatro', 'Obras y representaciones teatrales.', CURRENT_TIMESTAMP),
    ('Conferencias', 'conferencias', 'Congresos, charlas y encuentros profesionales.', CURRENT_TIMESTAMP),
    ('Comedia', 'comedia', 'Stand-up y espectáculos de humor.', CURRENT_TIMESTAMP);

-- Añadir la columna temporalmente nullable para preservar los eventos existentes.
ALTER TABLE "Event"
    ADD COLUMN "categoryId" INTEGER;

-- Asignar categorías según el nombre y la descripción.
-- Los eventos ambiguos o de pruebas quedan provisionalmente en Festivales.
UPDATE "Event" AS e
SET "categoryId" = c.id
FROM "EventCategory" AS c
WHERE c.slug = CASE
    WHEN concat_ws(' ', e."name", e."description") ILIKE '%teatro%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%obra teatral%'
        THEN 'teatro'

    WHEN concat_ws(' ', e."name", e."description") ILIKE '%stand-up%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%comedia%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%humor%'
        THEN 'comedia'

    WHEN concat_ws(' ', e."name", e."description") ILIKE '%carrera%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%fútbol%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%futbol%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%deporte%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%torneo%'
        THEN 'deportes'

    WHEN concat_ws(' ', e."name", e."description") ILIKE '%congreso%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%conferencia%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%emprendimiento%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%tecnología%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%tecnologia%'
        THEN 'conferencias'

    WHEN concat_ws(' ', e."name", e."description") ILIKE '%festival%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%feria%'
        THEN 'festivales'

    WHEN concat_ws(' ', e."name", e."description") ILIKE '%música%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%musica%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%concierto%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%vallenato%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%electrónica%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%electronica%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%dj%'
      OR concat_ws(' ', e."name", e."description") ILIKE '%fiesta%'
        THEN 'musica'

    ELSE 'festivales'
END;

-- No continuar si algún evento no recibió categoría.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Event"
        WHERE "categoryId" IS NULL
    ) THEN
        RAISE EXCEPTION 'Migración cancelada: existen eventos sin categoría.';
    END IF;
END $$;

-- Convertir la columna en obligatoria.
ALTER TABLE "Event"
    ALTER COLUMN "categoryId" SET NOT NULL;

-- Crear la relación con el catálogo de categorías.
ALTER TABLE "Event"
    ADD CONSTRAINT "Event_categoryId_fkey"
    FOREIGN KEY ("categoryId")
    REFERENCES "EventCategory"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
