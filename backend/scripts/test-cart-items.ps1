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

$userId = 1
$eventId = 9

# TicketType existente del evento 9.
$ticketTypeId = 11

# ProductVariant de apoyo.
# Debe existir y pertenecer a un producto del evento 9.
$productVariantId = 4

# ============================================================
# CREAR CARRITO DE APOYO
# ============================================================

$createCart = Test-Request `
    -Name "Crear carrito de apoyo" `
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

    Write-Host "Cart de apoyo creado con ID: $cartId"
}

# ============================================================
# 1. CREAR ITEM CON TICKET TYPE
# ============================================================

$ticketItem = $null

if ($cartId) {
    $ticketItem = Test-Request `
        -Name "Crear CartItem con TicketType" `
        -Method "POST" `
        -Url "$baseUrl/carts/$cartId/items" `
        -Body @{
            ticketTypeId = $ticketTypeId
            quantity = 2
        } `
        -ExpectedStatus 201
}

$ticketItemId = $null

if ($ticketItem) {
    $item = $ticketItem.Content | ConvertFrom-Json
    $ticketItemId = $item.id

    Write-Host "CartItem creado con ID: $ticketItemId"
}

# ============================================================
# 2. CREAR ITEM CON PRODUCT VARIANT
# ============================================================

if ($cartId) {
    Test-Request `
        -Name "Crear CartItem con ProductVariant" `
        -Method "POST" `
        -Url "$baseUrl/carts/$cartId/items" `
        -Body @{
            productVariantId = $productVariantId
            quantity = 1
        } `
        -ExpectedStatus 201 | Out-Null
}

# ============================================================
# 3. QUANTITY = 0
# ============================================================

if ($cartId) {
    Test-Request `
        -Name "Crear CartItem con quantity 0" `
        -Method "POST" `
        -Url "$baseUrl/carts/$cartId/items" `
        -Body @{
            ticketTypeId = $ticketTypeId
            quantity = 0
        } `
        -ExpectedStatus 400 | Out-Null
}

# ============================================================
# 4. TICKET TYPE INEXISTENTE
# ============================================================

if ($cartId) {
    Test-Request `
        -Name "Crear CartItem con TicketType inexistente" `
        -Method "POST" `
        -Url "$baseUrl/carts/$cartId/items" `
        -Body @{
            ticketTypeId = 999999
            quantity = 1
        } `
        -ExpectedStatus 404 | Out-Null
}

# ============================================================
# 5. PRODUCT VARIANT INEXISTENTE
# ============================================================

if ($cartId) {
    Test-Request `
        -Name "Crear CartItem con ProductVariant inexistente" `
        -Method "POST" `
        -Url "$baseUrl/carts/$cartId/items" `
        -Body @{
            productVariantId = 999999
            quantity = 1
        } `
        -ExpectedStatus 404 | Out-Null
}

# ============================================================
# 6. TICKET TYPE + PRODUCT VARIANT
# ============================================================

if ($cartId) {
    Test-Request `
        -Name "Crear CartItem con TicketType y ProductVariant" `
        -Method "POST" `
        -Url "$baseUrl/carts/$cartId/items" `
        -Body @{
            ticketTypeId = $ticketTypeId
            productVariantId = $productVariantId
            quantity = 1
        } `
        -ExpectedStatus 400 | Out-Null
}

# ============================================================
# 7. SIN TICKET TYPE NI PRODUCT VARIANT
# ============================================================

if ($cartId) {
    Test-Request `
        -Name "Crear CartItem sin TicketType ni ProductVariant" `
        -Method "POST" `
        -Url "$baseUrl/carts/$cartId/items" `
        -Body @{
            quantity = 1
        } `
        -ExpectedStatus 400 | Out-Null
}

# ============================================================
# 8. STOCK INSUFICIENTE
# ============================================================

if ($cartId) {
    Test-Request `
        -Name "Crear CartItem con stock insuficiente" `
        -Method "POST" `
        -Url "$baseUrl/carts/$cartId/items" `
        -Body @{
            ticketTypeId = $ticketTypeId
            quantity = 999999
        } `
        -ExpectedStatus 400 | Out-Null
}

# ============================================================
# 9. ACTUALIZAR CART ITEM
# ============================================================

if ($ticketItemId) {
    Test-Request `
        -Name "Actualizar cantidad del CartItem" `
        -Method "PATCH" `
        -Url "$baseUrl/cart-items/$ticketItemId" `
        -Body @{
            quantity = 3
        } `
        -ExpectedStatus 200 | Out-Null
}

# ============================================================
# 10. ACTUALIZAR CON QUANTITY = 0
# ============================================================

if ($ticketItemId) {
    Test-Request `
        -Name "Actualizar CartItem con quantity 0" `
        -Method "PATCH" `
        -Url "$baseUrl/cart-items/$ticketItemId" `
        -Body @{
            quantity = 0
        } `
        -ExpectedStatus 400 | Out-Null
}

# ============================================================
# 11. ELIMINAR CART ITEM
# ============================================================

if ($ticketItemId) {
    Test-Request `
        -Name "Eliminar CartItem" `
        -Method "DELETE" `
        -Url "$baseUrl/cart-items/$ticketItemId" `
        -Body $null `
        -ExpectedStatus 200 | Out-Null
}

# ============================================================
# 12. ELIMINAR CART ITEM INEXISTENTE
# ============================================================

if ($ticketItemId) {
    Test-Request `
        -Name "Eliminar CartItem inexistente" `
        -Method "DELETE" `
        -Url "$baseUrl/cart-items/$ticketItemId" `
        -Body $null `
        -ExpectedStatus 404 | Out-Null
}

# ============================================================
# RESULTADO FINAL
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

