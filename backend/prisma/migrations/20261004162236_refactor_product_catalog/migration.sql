/*
  Migración de refactor del catálogo de productos.

  Cambios principales:
  - Elimina Product.gender.
  - Elimina ProductVariant.colorId.
  - Elimina ProductVariant.sizeId.
  - Elimina las tablas Color y Size.
  - Agrega ProductCategory.slug e isActive.
  - Agrega ProductImage.publicId.
  - Crea ProductOption.
  - Crea ProductOptionValue.
  - Crea ProductVariantOptionValue.
*/

-- ============================================================
-- 1. VALIDACIÓN PREVIA DE RELACIONES ANTIGUAS
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ProductVariant"
    WHERE "colorId" IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'La migración fue detenida: existen ProductVariant con colorId. Revisar datos antes de eliminar ProductVariant.colorId.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "ProductVariant"
    WHERE "sizeId" IS NOT NULL
  ) THEN
    RAISE EXCEPTION
      'La migración fue detenida: existen ProductVariant con sizeId. Revisar datos antes de eliminar ProductVariant.sizeId.';
  END IF;
END $$;


-- ============================================================
-- 2. ELIMINAR FOREIGN KEYS ANTIGUAS
-- ============================================================

ALTER TABLE "ProductVariant"
DROP CONSTRAINT "ProductVariant_colorId_fkey";

ALTER TABLE "ProductVariant"
DROP CONSTRAINT "ProductVariant_sizeId_fkey";


-- ============================================================
-- 3. PRODUCT CATEGORY
-- ============================================================

ALTER TABLE "ProductCategory"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "ProductCategory"
ADD COLUMN "slug" TEXT;


-- ============================================================
-- 4. MIGRAR SLUGS DE LAS CATEGORÍAS EXISTENTES
-- ============================================================

UPDATE "ProductCategory"
SET "slug" = CASE "id"
  WHEN 2 THEN 'categoria-variant-test'
  WHEN 3 THEN 'categoria-image-test'
  WHEN 4 THEN 'categoria-test-promotions-20260928020531'
  WHEN 5 THEN 'categoria-test-promotions-20260928020738'
  WHEN 6 THEN 'categoria-test-promotions-20260928021056'
  ELSE NULL
END;


-- ============================================================
-- 5. VALIDAR QUE TODAS LAS CATEGORÍAS TENGAN SLUG
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ProductCategory"
    WHERE "slug" IS NULL
  ) THEN
    RAISE EXCEPTION
      'La migración fue detenida: existe una ProductCategory sin slug asignado.';
  END IF;
END $$;


-- ============================================================
-- 6. HACER SLUG OBLIGATORIO
-- ============================================================

ALTER TABLE "ProductCategory"
ALTER COLUMN "slug" SET NOT NULL;


-- ============================================================
-- 7. PRODUCT IMAGE
-- ============================================================
-- ProductImage está vacía actualmente, por lo que podemos
-- agregar publicId directamente como NOT NULL.

ALTER TABLE "ProductImage"
ADD COLUMN "publicId" TEXT NOT NULL;


-- ============================================================
-- 8. PRODUCT
-- ============================================================

ALTER TABLE "Product"
DROP COLUMN "gender";


-- ============================================================
-- 9. PRODUCT VARIANT
-- ============================================================

ALTER TABLE "ProductVariant"
DROP COLUMN "colorId",
DROP COLUMN "sizeId";


-- ============================================================
-- 10. ELIMINAR TABLAS ANTIGUAS
-- ============================================================

DROP TABLE "Color";

DROP TABLE "Size";


-- ============================================================
-- 11. CREAR PRODUCT OPTION
-- ============================================================

CREATE TABLE "ProductOption" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "productId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);


-- ============================================================
-- 12. CREAR PRODUCT OPTION VALUE
-- ============================================================

CREATE TABLE "ProductOptionValue" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "optionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY ("id")
);


-- ============================================================
-- 13. CREAR RELACIÓN VARIANT ↔ OPTION VALUE
-- ============================================================

CREATE TABLE "ProductVariantOptionValue" (
    "variantId" INTEGER NOT NULL,
    "optionValueId" INTEGER NOT NULL,

    CONSTRAINT "ProductVariantOptionValue_pkey"
      PRIMARY KEY ("variantId", "optionValueId")
);


-- ============================================================
-- 14. ÍNDICES UNIQUE
-- ============================================================

CREATE UNIQUE INDEX "ProductOption_productId_name_key"
ON "ProductOption"("productId", "name");

CREATE UNIQUE INDEX "ProductOptionValue_optionId_value_key"
ON "ProductOptionValue"("optionId", "value");

CREATE UNIQUE INDEX "ProductCategory_slug_key"
ON "ProductCategory"("slug");


-- ============================================================
-- 15. FOREIGN KEY PRODUCT OPTION → PRODUCT
-- ============================================================

ALTER TABLE "ProductOption"
ADD CONSTRAINT "ProductOption_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "Product"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


-- ============================================================
-- 16. FOREIGN KEY OPTION VALUE → OPTION
-- ============================================================

ALTER TABLE "ProductOptionValue"
ADD CONSTRAINT "ProductOptionValue_optionId_fkey"
FOREIGN KEY ("optionId")
REFERENCES "ProductOption"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


-- ============================================================
-- 17. FOREIGN KEY VARIANT OPTION VALUE → VARIANT
-- ============================================================

ALTER TABLE "ProductVariantOptionValue"
ADD CONSTRAINT "ProductVariantOptionValue_variantId_fkey"
FOREIGN KEY ("variantId")
REFERENCES "ProductVariant"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


-- ============================================================
-- 18. FOREIGN KEY VARIANT OPTION VALUE → OPTION VALUE
-- ============================================================

ALTER TABLE "ProductVariantOptionValue"
ADD CONSTRAINT "ProductVariantOptionValue_optionValueId_fkey"
FOREIGN KEY ("optionValueId")
REFERENCES "ProductOptionValue"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;