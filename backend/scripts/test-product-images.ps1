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
Write-Host "TEST PRODUCT IMAGES - EVENTIA"
Write-Host "========================================"


# ============================================================
# 1. CREAR CATEGORÍA
# ============================================================

$category = Test-Request `
    -Name "Crear categoría de prueba" `
    -Method "POST" `
    -Url "$baseUrl/product-categories" `
    -Body @{
        name = "Categoría Image TEST"
        description = "Categoría temporal para ProductImage"
    } `
    -ExpectedStatus 201

$categoryData = $category.Content | ConvertFrom-Json
$categoryId = $categoryData.id


# ============================================================
# 2. CREAR EVENTO CON PRODUCTS
# ============================================================

$event = Test-Request `
    -Name "Crear evento con productos habilitados" `
    -Method "POST" `
    -Url "$baseUrl/events" `
    -Body @{
        name = "Evento Image TEST"
        description = "Evento temporal para ProductImage"
        date = "2027-09-15T20:00:00.000Z"
        organizerId = 1
        templateId = 2
    } `
    -ExpectedStatus 201

$eventData = $event.Content | ConvertFrom-Json
$eventId = $eventData.id


# ============================================================
# 3. CREAR PRODUCTO
# ============================================================

$product = Test-Request `
    -Name "Crear producto de prueba" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/products" `
    -Body @{
        name = "Producto Image TEST"
        description = "Producto temporal para probar imágenes"
        gender = "UNISEX"
        categoryId = $categoryId
    } `
    -ExpectedStatus 201

$productData = $product.Content | ConvertFrom-Json
$productId = $productData.id

Write-Host "Producto creado: $productId"


# ============================================================
# 4. CREAR IMAGEN
# ============================================================

$image = Test-Request `
    -Name "Crear imagen válida" `
    -Method "POST" `
    -Url "$baseUrl/products/$productId/images" `
    -Body @{
        url = "https://example.com/eventia-producto.jpg"
        altText = "Imagen del producto EVENTIA"
        position = 0
    } `
    -ExpectedStatus 201

$imageData = $image.Content | ConvertFrom-Json
$imageId = $imageData.id

Write-Host "Imagen creada: $imageId"


# ============================================================
# 5. OBTENER TODAS LAS IMÁGENES
# ============================================================

Test-Request `
    -Name "Obtener imágenes del producto" `
    -Method "GET" `
    -Url "$baseUrl/products/$productId/images" `
    -ExpectedStatus 200


# ============================================================
# 6. OBTENER IMAGEN POR ID
# ============================================================

Test-Request `
    -Name "Obtener imagen por ID" `
    -Method "GET" `
    -Url "$baseUrl/product-images/$imageId" `
    -ExpectedStatus 200


# ============================================================
# 7. ACTUALIZAR IMAGEN
# ============================================================

Test-Request `
    -Name "Actualizar imagen" `
    -Method "PATCH" `
    -Url "$baseUrl/product-images/$imageId" `
    -Body @{
        url = "https://example.com/eventia-producto-actualizado.jpg"
        altText = "Imagen actualizada del producto EVENTIA"
        position = 1
    } `
    -ExpectedStatus 200


# ============================================================
# 8. URL VACÍA
# ============================================================

Test-Request `
    -Name "URL vacía debe ser rechazada" `
    -Method "POST" `
    -Url "$baseUrl/products/$productId/images" `
    -Body @{
        url = ""
        altText = "Imagen inválida"
        position = 0
    } `
    -ExpectedStatus 400


# ============================================================
# 9. POSITION NEGATIVO
# ============================================================

Test-Request `
    -Name "Position negativo debe ser rechazado" `
    -Method "POST" `
    -Url "$baseUrl/products/$productId/images" `
    -Body @{
        url = "https://example.com/imagen.jpg"
        altText = "Imagen inválida"
        position = -1
    } `
    -ExpectedStatus 400


# ============================================================
# 10. IMAGEN INEXISTENTE
# ============================================================

Test-Request `
    -Name "Obtener imagen inexistente" `
    -Method "GET" `
    -Url "$baseUrl/product-images/999999" `
    -ExpectedStatus 404


# ============================================================
# 11. ACTUALIZAR IMAGEN INEXISTENTE
# ============================================================

Test-Request `
    -Name "Actualizar imagen inexistente" `
    -Method "PATCH" `
    -Url "$baseUrl/product-images/999999" `
    -Body @{
        url = "https://example.com/no-existe.jpg"
    } `
    -ExpectedStatus 404


# ============================================================
# 12. ELIMINAR IMAGEN
# ============================================================

Test-Request `
    -Name "Eliminar imagen" `
    -Method "DELETE" `
    -Url "$baseUrl/product-images/$imageId" `
    -ExpectedStatus 200


# ============================================================
# 13. ELIMINAR IMAGEN NUEVAMENTE
# ============================================================

Test-Request `
    -Name "Eliminar imagen inexistente después del DELETE" `
    -Method "DELETE" `
    -Url "$baseUrl/product-images/$imageId" `
    -ExpectedStatus 404


# ============================================================
# RESUMEN
# ============================================================

Write-Host ""
Write-Host "========================================"
Write-Host "RESUMEN TEST PRODUCT IMAGES"
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