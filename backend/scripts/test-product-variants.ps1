$baseUrl = "http://localhost:3000"

$passed = 0
$failed = 0

function Test-Request {
    param (
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [hashtable]$Body,
        [int]$ExpectedStatus
    )

    Write-Host ""
    Write-Host "========================================"
    Write-Host $Name
    Write-Host "========================================"

    try {
        $jsonBody = $null

        if ($Body) {
            $jsonBody = $Body | ConvertTo-Json
        }

        $response = Invoke-WebRequest `
            -Uri $Url `
            -Method $Method `
            -ContentType "application/json" `
            -Body $jsonBody `
            -ErrorAction Stop

        $status = [int]$response.StatusCode

        Write-Host "Status recibido:  $status"
        Write-Host "Status esperado:  $ExpectedStatus"

        if ($status -eq $ExpectedStatus) {
            Write-Host "PASS"
            $script:passed++
        }
        else {
            Write-Host "FAIL"
            $script:failed++
        }

        return $response
    }
    catch {
        $status = 0

        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        }

        Write-Host "Status recibido:  $status"
        Write-Host "Status esperado:  $ExpectedStatus"

        if ($status -eq $ExpectedStatus) {
            Write-Host "PASS"
            $script:passed++
        }
        else {
            Write-Host "FAIL"
            $script:failed++
            Write-Host "Error: $($_.Exception.Message)"
        }

        return $null
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "TEST PRODUCT VARIANTS - EVENTIA"
Write-Host "========================================"


# ============================================================
# 1. CREAR CATEGORÍA
# ============================================================

$category = Test-Request `
    -Name "Crear categoría de prueba" `
    -Method "POST" `
    -Url "$baseUrl/product-categories" `
    -Body @{
        name = "Categoría Variant TEST"
        description = "Categoría temporal para ProductVariant"
    } `
    -ExpectedStatus 201

$categoryData = $category.Content | ConvertFrom-Json
$categoryId = $categoryData.id


# ============================================================
# 2. CREAR COLOR
# ============================================================

$color = Test-Request `
    -Name "Crear color de prueba" `
    -Method "POST" `
    -Url "$baseUrl/colors" `
    -Body @{
        name = "Negro Variant TEST"
        hex = "#000000"
    } `
    -ExpectedStatus 201

$colorData = $color.Content | ConvertFrom-Json
$colorId = $colorData.id


# ============================================================
# 3. CREAR TALLA
# ============================================================

$size = Test-Request `
    -Name "Crear talla de prueba" `
    -Method "POST" `
    -Url "$baseUrl/sizes" `
    -Body @{
        system = "TEST"
        value = "M"
        normalizedCm = 50
    } `
    -ExpectedStatus 201

$sizeData = $size.Content | ConvertFrom-Json
$sizeId = $sizeData.id


# ============================================================
# 4. CREAR EVENTO CON PRODUCTS
# ============================================================

$event = Test-Request `
    -Name "Crear evento con productos habilitados" `
    -Method "POST" `
    -Url "$baseUrl/events" `
    -Body @{
        name = "Evento Variant TEST"
        description = "Evento temporal para ProductVariant"
        date = "2027-08-15T20:00:00.000Z"
        organizerId = 1
        templateId = 2
    } `
    -ExpectedStatus 201

$eventData = $event.Content | ConvertFrom-Json
$eventId = $eventData.id


# ============================================================
# 5. CREAR PRODUCTO
# ============================================================

$product = Test-Request `
    -Name "Crear producto de prueba" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/products" `
    -Body @{
        name = "Camiseta Variant TEST"
        description = "Producto temporal"
        gender = "UNISEX"
        categoryId = $categoryId
    } `
    -ExpectedStatus 201

$productData = $product.Content | ConvertFrom-Json
$productId = $productData.id


# ============================================================
# 6. CREAR VARIANTE VÁLIDA
# ============================================================

$variant = Test-Request `
    -Name "Crear variante válida" `
    -Method "POST" `
    -Url "$baseUrl/products/$productId/variants" `
    -Body @{
        sku = "VARIANT-TEST-001"
        price = 85000
        quantity = 50
        colorId = $colorId
        sizeId = $sizeId
    } `
    -ExpectedStatus 201

$variantData = $variant.Content | ConvertFrom-Json
$variantId = $variantData.id

Write-Host "Variante creada: $variantId"


# ============================================================
# 7. OBTENER TODAS LAS VARIANTES
# ============================================================

Test-Request `
    -Name "Obtener variantes del producto" `
    -Method "GET" `
    -Url "$baseUrl/products/$productId/variants" `
    -ExpectedStatus 200


# ============================================================
# 8. OBTENER VARIANTE POR ID
# ============================================================

Test-Request `
    -Name "Obtener variante por ID" `
    -Method "GET" `
    -Url "$baseUrl/product-variants/$variantId" `
    -ExpectedStatus 200


# ============================================================
# 9. SKU DUPLICADO
# ============================================================

Test-Request `
    -Name "SKU duplicado debe devolver 409" `
    -Method "POST" `
    -Url "$baseUrl/products/$productId/variants" `
    -Body @{
        sku = "VARIANT-TEST-001"
        price = 90000
        quantity = 20
        colorId = $colorId
        sizeId = $sizeId
    } `
    -ExpectedStatus 409


# ============================================================
# 10. COLOR INEXISTENTE
# ============================================================

Test-Request `
    -Name "Color inexistente debe devolver 404" `
    -Method "POST" `
    -Url "$baseUrl/products/$productId/variants" `
    -Body @{
        sku = "VARIANT-TEST-002"
        price = 90000
        quantity = 20
        colorId = 999999
        sizeId = $sizeId
    } `
    -ExpectedStatus 404


# ============================================================
# 11. TALLA INEXISTENTE
# ============================================================

Test-Request `
    -Name "Talla inexistente debe devolver 404" `
    -Method "POST" `
    -Url "$baseUrl/products/$productId/variants" `
    -Body @{
        sku = "VARIANT-TEST-003"
        price = 90000
        quantity = 20
        colorId = $colorId
        sizeId = 999999
    } `
    -ExpectedStatus 404


# ============================================================
# 12. PRECIO NEGATIVO
# ============================================================

Test-Request `
    -Name "Precio negativo debe ser rechazado" `
    -Method "POST" `
    -Url "$baseUrl/products/$productId/variants" `
    -Body @{
        sku = "VARIANT-TEST-004"
        price = -100
        quantity = 20
        colorId = $colorId
        sizeId = $sizeId
    } `
    -ExpectedStatus 400


# ============================================================
# 13. CANTIDAD CERO
# ============================================================

Test-Request `
    -Name "Cantidad cero debe ser rechazada" `
    -Method "POST" `
    -Url "$baseUrl/products/$productId/variants" `
    -Body @{
        sku = "VARIANT-TEST-005"
        price = 90000
        quantity = 0
        colorId = $colorId
        sizeId = $sizeId
    } `
    -ExpectedStatus 400


# ============================================================
# 14. PRECIO COMO TEXTO
# ============================================================

Test-Request `
    -Name "Precio como texto debe ser rechazado" `
    -Method "POST" `
    -Url "$baseUrl/products/$productId/variants" `
    -Body @{
        sku = "VARIANT-TEST-006"
        price = "90000"
        quantity = 20
        colorId = $colorId
        sizeId = $sizeId
    } `
    -ExpectedStatus 400


# ============================================================
# 15. CREAR SEGUNDA VARIANTE
# ============================================================

$variant2 = Test-Request `
    -Name "Crear segunda variante" `
    -Method "POST" `
    -Url "$baseUrl/products/$productId/variants" `
    -Body @{
        sku = "VARIANT-TEST-002"
        price = 95000
        quantity = 30
        colorId = $colorId
        sizeId = $sizeId
    } `
    -ExpectedStatus 201

$variant2Data = $variant2.Content | ConvertFrom-Json
$variant2Id = $variant2Data.id


# ============================================================
# 16. ACTUALIZAR VARIANTE
# ============================================================

Test-Request `
    -Name "Actualizar variante" `
    -Method "PATCH" `
    -Url "$baseUrl/product-variants/$variantId" `
    -Body @{
        price = 90000
        quantity = 60
    } `
    -ExpectedStatus 200


# ============================================================
# 17. ACTUALIZAR CON SKU DUPLICADO
# ============================================================

Test-Request `
    -Name "Actualizar con SKU duplicado debe devolver 409" `
    -Method "PATCH" `
    -Url "$baseUrl/product-variants/$variantId" `
    -Body @{
        sku = "VARIANT-TEST-002"
    } `
    -ExpectedStatus 409


# ============================================================
# 18. VARIANTE INEXISTENTE
# ============================================================

Test-Request `
    -Name "Actualizar variante inexistente" `
    -Method "PATCH" `
    -Url "$baseUrl/product-variants/999999" `
    -Body @{
        price = 100000
    } `
    -ExpectedStatus 404


# ============================================================
# 19. ELIMINAR SEGUNDA VARIANTE
# ============================================================

Test-Request `
    -Name "Eliminar segunda variante" `
    -Method "DELETE" `
    -Url "$baseUrl/product-variants/$variant2Id" `
    -ExpectedStatus 200


# ============================================================
# 20. ELIMINAR PRIMERA VARIANTE
# ============================================================

Test-Request `
    -Name "Eliminar primera variante" `
    -Method "DELETE" `
    -Url "$baseUrl/product-variants/$variantId" `
    -ExpectedStatus 200


# ============================================================
# 21. ELIMINAR VARIANTE NUEVAMENTE
# ============================================================

Test-Request `
    -Name "Eliminar variante inexistente después del DELETE" `
    -Method "DELETE" `
    -Url "$baseUrl/product-variants/$variantId" `
    -ExpectedStatus 404


# ============================================================
# RESUMEN
# ============================================================

Write-Host ""
Write-Host "========================================"
Write-Host "RESUMEN TEST PRODUCT VARIANTS"
Write-Host "========================================"

Write-Host "PASS: $passed"
Write-Host "FAIL: $failed"

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "TODAS LAS PRUEBAS PASARON"
}
else {
    Write-Host ""
    Write-Host "HAY PRUEBAS FALLIDAS"
}