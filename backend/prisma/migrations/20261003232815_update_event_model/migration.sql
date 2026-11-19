/*
  Migración segura de Event:
  - Conserva los 16 registros existentes.
  - date → startAt
  - genera endAt
  - genera slug único
  - asigna valores temporales a venue y city
*/

-- 1. Agregar las nuevas columnas como opcionales
ALTER TABLE "Event"
ADD COLUMN "address" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "coverImageUrl" TEXT,
ADD COLUMN "endAt" TIMESTAMP(3),
ADD COLUMN "latitude" DECIMAL(10,7),
ADD COLUMN "longitude" DECIMAL(10,7),
ADD COLUMN "slug" TEXT,
ADD COLUMN "startAt" TIMESTAMP(3),
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "venue" TEXT;

-- 2. Conservar la fecha anterior como fecha de inicio
UPDATE "Event"
SET "startAt" = "date";

-- 3. Crear una fecha de finalización temporal
--    3 horas después del inicio
UPDATE "Event"
SET "endAt" = "date" + INTERVAL '3 hours';

-- 4. Generar un slug único para cada evento
UPDATE "Event"
SET "slug" = 'evento-' || "id";

-- 5. Valores temporales para los campos nuevos obligatorios
UPDATE "Event"
SET
  "venue" = 'Por definir',
  "city" = 'Valledupar';

-- 6. Convertir los campos necesarios en obligatorios
ALTER TABLE "Event"
ALTER COLUMN "slug" SET NOT NULL,
ALTER COLUMN "startAt" SET NOT NULL,
ALTER COLUMN "endAt" SET NOT NULL,
ALTER COLUMN "venue" SET NOT NULL,
ALTER COLUMN "city" SET NOT NULL;

-- 7. Ahora sí podemos eliminar la columna antigua
ALTER TABLE "Event"
DROP COLUMN "date";

-- 8. Índice único del slug
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- 9. Crear galería de imágenes
CREATE TABLE "EventImage" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "altText" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "eventId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventImage_pkey" PRIMARY KEY ("id")
);

-- 10. Relación Event → EventImage
ALTER TABLE "EventImage"
ADD CONSTRAINT "EventImage_eventId_fkey"
FOREIGN KEY ("eventId")
REFERENCES "Event"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;