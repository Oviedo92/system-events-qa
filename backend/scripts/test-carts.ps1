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

# ============================================================
# DATOS DE APOYO
# ============================================================

# Usuario y evento existentes.
# Se utilizan como datos de apoyo para probar Cart.
$userId = 1
$eventId = 5

# ============================================================
# 1. CREAR CART
# ============================================================

$createCart = Test-Request `
    -Name "Crear carrito" `
    -Method "POST" `
    -Url "$baseUrl/users/$userId/cart" `
    -Body @{
        userId = $userId
        eventId = $eventId
    } `
    -ExpectedStatus 201

$cartId = $null

if ($createCart) {
    $cart = $createCart.Content | ConvertFrom-Json
    $cartId = $cart.id

    Write-Host "Cart creado con ID: $cartId"
}

# ============================================================
# 2. LISTAR CARRITOS DEL USUARIO
# ============================================================

Test-Request `
    -Name "Listar carritos del usuario" `
    -Method "GET" `
    -Url "$baseUrl/users/$userId/cart" `
    -Body $null `
    -ExpectedStatus 200 | Out-Null

# ============================================================
# 3. OBTENER CARRITO POR ID
# ============================================================

if ($cartId) {
    Test-Request `
        -Name "Obtener carrito por ID" `
        -Method "GET" `
        -Url "$baseUrl/carts/$cartId" `
        -Body $null `
        -ExpectedStatus 200 | Out-Null
}

# ============================================================
# 4. USUARIO INEXISTENTE
# ============================================================

Test-Request `
    -Name "Crear carrito con usuario inexistente" `
    -Method "POST" `
    -Url "$baseUrl/users/999999/cart" `
    -Body @{
        userId = 999999
        eventId = $eventId
    } `
    -ExpectedStatus 404 | Out-Null

# ============================================================
# 5. EVENTO INEXISTENTE
# ============================================================

Test-Request `
    -Name "Crear carrito con evento inexistente" `
    -Method "POST" `
    -Url "$baseUrl/users/$userId/cart" `
    -Body @{
        userId = $userId
        eventId = 999999
    } `
    -ExpectedStatus 404 | Out-Null

# ============================================================
# 6. ACTUALIZAR CARRITO
# ============================================================

if ($cartId) {
    Test-Request `
        -Name "Actualizar estado del carrito" `
        -Method "PATCH" `
        -Url "$baseUrl/carts/$cartId" `
        -Body @{
            status = "CHECKOUT"
        } `
        -ExpectedStatus 200 | Out-Null
}

# ============================================================
# 7. PROMOCIÓN DE OTRO EVENTO
# ============================================================

# ID de promoción de apoyo.
# Debe pertenecer a otro evento distinto al evento del carrito.
$otherEventPromotionId = 1

if ($cartId) {
    Test-Request `
        -Name "Asignar promoción de otro evento" `
        -Method "PATCH" `
        -Url "$baseUrl/carts/$cartId" `
        -Body @{
            promotionId = $otherEventPromotionId
        } `
        -ExpectedStatus 404 | Out-Null
}

# ============================================================
# 8. ELIMINAR CARRITO
# ============================================================

if ($cartId) {
    Test-Request `
        -Name "Eliminar carrito" `
        -Method "DELETE" `
        -Url "$baseUrl/carts/$cartId" `
        -Body $null `
        -ExpectedStatus 200 | Out-Null
}

# ============================================================
# 9. ELIMINAR CARRITO INEXISTENTE
# ============================================================

if ($cartId) {
    Test-Request `
        -Name "Eliminar carrito inexistente" `
        -Method "DELETE" `
        -Url "$baseUrl/carts/$cartId" `
        -Body $null `
        -ExpectedStatus 404 | Out-Null
}

# ============================================================
# RESULTADO
# ============================================================

Write-Host ""
Write-Host "========================================"
Write-Host "RESULTADO FINAL"
Write-Host "========================================"
Write-Host "PASS: $passed"
Write-Host "FAIL: $failed"

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "TODOS LOS TESTS PASARON"
}
else {
    Write-Host ""
    Write-Host "HAY TESTS FALLIDOS"
}

