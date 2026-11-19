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
Write-Host "TEST PRODUCTS - EVENTIA"
Write-Host "========================================"


# ============================================================
# 1. CREAR CATEGORIA
# ============================================================

$category = Test-Request `
    -Name "Crear categoría para producto" `
    -Method "POST" `
    -Url "$baseUrl/product-categories" `
    -Body @{
        name = "Merchandising TEST"
        description = "Categoría creada para pruebas de Product"
    } `
    -ExpectedStatus 201

$categoryData = $category.Content | ConvertFrom-Json
$categoryId = $categoryData.id

Write-Host "Categoría creada: $categoryId"


# ============================================================
# 2. CREAR EVENTO QUE SI PERMITE PRODUCTOS
# ============================================================

$event = Test-Request `
    -Name "Crear evento con productos habilitados" `
    -Method "POST" `
    -Url "$baseUrl/events" `
    -Body @{
        name = "Evento TEST Productos"
        description = "Evento para probar Product"
        date = "2027-06-15T20:00:00.000Z"
        organizerId = 1
        templateId = 2
    } `
    -ExpectedStatus 201

$eventData = $event.Content | ConvertFrom-Json
$eventId = $eventData.id

Write-Host "Evento creado: $eventId"


# ============================================================
# 3. CREAR EVENTO QUE NO PERMITE PRODUCTOS
# ============================================================

$blockedEvent = Test-Request `
    -Name "Crear evento sin productos habilitados" `
    -Method "POST" `
    -Url "$baseUrl/events" `
    -Body @{
        name = "Evento TEST Sin Productos"
        description = "Evento para validar bloqueo de productos"
        date = "2027-07-15T20:00:00.000Z"
        organizerId = 1
        templateId = 1
    } `
    -ExpectedStatus 201

$blockedEventData = $blockedEvent.Content | ConvertFrom-Json
$blockedEventId = $blockedEventData.id

Write-Host "Evento bloqueado creado: $blockedEventId"


# ============================================================
# 4. CREAR PRODUCTO
# ============================================================

$product = Test-Request `
    -Name "Crear producto válido" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/products" `
    -Body @{
        name = "Camiseta EVENTIA"
        description = "Camiseta oficial de prueba"
        gender = "UNISEX"
        categoryId = $categoryId
    } `
    -ExpectedStatus 201

$productData = $product.Content | ConvertFrom-Json
$productId = $productData.id

Write-Host "Producto creado: $productId"


# ============================================================
# 5. OBTENER TODOS LOS PRODUCTOS
# ============================================================

Test-Request `
    -Name "Obtener productos del evento" `
    -Method "GET" `
    -Url "$baseUrl/events/$eventId/products" `
    -ExpectedStatus 200


# ============================================================
# 6. OBTENER PRODUCTO POR ID
# ============================================================

Test-Request `
    -Name "Obtener producto por ID" `
    -Method "GET" `
    -Url "$baseUrl/products/$productId" `
    -ExpectedStatus 200


# ============================================================
# 7. ACTUALIZAR PRODUCTO
# ============================================================

Test-Request `
    -Name "Actualizar producto" `
    -Method "PATCH" `
    -Url "$baseUrl/products/$productId" `
    -Body @{
        name = "Camiseta EVENTIA Actualizada"
        description = "Descripción actualizada"
        gender = "UNISEX"
        categoryId = $categoryId
    } `
    -ExpectedStatus 200


# ============================================================
# 8. PRODUCTO EN EVENTO SIN PRODUCTS
# ============================================================

Test-Request `
    -Name "Producto en evento sin productos debe ser rechazado" `
    -Method "POST" `
    -Url "$baseUrl/events/$blockedEventId/products" `
    -Body @{
        name = "Producto Bloqueado"
        description = "No debería crearse"
        gender = "UNISEX"
        categoryId = $categoryId
    } `
    -ExpectedStatus 400


# ============================================================
# 9. CATEGORÍA INEXISTENTE
# ============================================================

Test-Request `
    -Name "Categoría inexistente debe devolver 404" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/products" `
    -Body @{
        name = "Producto Categoría Inexistente"
        description = "Prueba"
        gender = "UNISEX"
        categoryId = 999999
    } `
    -ExpectedStatus 404


# ============================================================
# 10. NOMBRE VACÍO
# ============================================================

Test-Request `
    -Name "Nombre vacío debe ser rechazado" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/products" `
    -Body @{
        name = ""
        description = "Producto inválido"
        gender = "UNISEX"
        categoryId = $categoryId
    } `
    -ExpectedStatus 400


# ============================================================
# 11. PRODUCTO INEXISTENTE
# ============================================================

Test-Request `
    -Name "Producto inexistente debe devolver 404" `
    -Method "GET" `
    -Url "$baseUrl/products/999999" `
    -ExpectedStatus 404


# ============================================================
# 12. ACTUALIZAR PRODUCTO INEXISTENTE
# ============================================================

Test-Request `
    -Name "Actualizar producto inexistente" `
    -Method "PATCH" `
    -Url "$baseUrl/products/999999" `
    -Body @{
        name = "Producto inexistente"
    } `
    -ExpectedStatus 404


# ============================================================
# 13. ELIMINAR PRODUCTO
# ============================================================

Test-Request `
    -Name "Eliminar producto" `
    -Method "DELETE" `
    -Url "$baseUrl/products/$productId" `
    -ExpectedStatus 200


# ============================================================
# 14. ELIMINAR PRODUCTO NUEVAMENTE
# ============================================================

Test-Request `
    -Name "Eliminar producto inexistente después del DELETE" `
    -Method "DELETE" `
    -Url "$baseUrl/products/$productId" `
    -ExpectedStatus 404


# ============================================================
# 15. ELIMINAR CATEGORÍA DE PRUEBA
# ============================================================

Test-Request `
    -Name "Eliminar categoría de prueba" `
    -Method "DELETE" `
    -Url "$baseUrl/product-categories/$categoryId" `
    -ExpectedStatus 200


# ============================================================
# RESUMEN
# ============================================================

Write-Host ""
Write-Host "========================================"
Write-Host "RESUMEN TEST PRODUCTS"
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