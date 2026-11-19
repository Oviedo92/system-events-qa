# ============================================================
# TEST CART PRICING
# ============================================================

$baseUrl = "http://localhost:3000"

$passed = 0
$failed = 0

# ============================================================
# DATOS DE APOYO YA EXISTENTES
# ============================================================

$userId = 1
$eventId = 9

# TicketType del evento 9
$ticketTypeId = 11

# ProductVariant del evento 9
$productVariantId = 4

# ============================================================
# FUNCIONES AUXILIARES
# ============================================================

function Get-ResponseStatus {
    param ($Exception)

    if ($Exception.Response) {
        try {
            return [int]$Exception.Response.StatusCode.value__
        }
        catch {
            return [int]$Exception.Response.StatusCode
        }
    }

    return 0
}

function Test-Status {
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

        if ($response.Content) {
            return ($response.Content | ConvertFrom-Json)
        }

        return $null
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

function Test-Value {
    param (
        [string]$Name,
        [decimal]$Actual,
        [decimal]$Expected
    )

    Write-Host ""
    Write-Host "----------------------------------------"
    Write-Host $Name
    Write-Host "Valor recibido:  $Actual"
    Write-Host "Valor esperado:  $Expected"

    if ($Actual -eq $Expected) {
        Write-Host "PASS"
        $script:passed++
    }
    else {
        Write-Host "FAIL"
        $script:failed++
    }
}

# ============================================================
# 1. CREAR CARRITO DE APOYO
# ============================================================

$cart = Test-Status `
    -Name "Crear carrito de pricing" `
    -Method "POST" `
    -Url "$baseUrl/users/$userId/cart" `
    -Body @{
        userId = $userId
        eventId = $eventId
    } `
    -ExpectedStatus 201

if (-not $cart) {
    Write-Host ""
    Write-Host "No se pudo crear el carrito. Se detienen las pruebas."
    exit 1
}

$cartId = $cart.id

Write-Host "Cart de pricing creado con ID: $cartId"

# ============================================================
# 2. AGREGAR TICKETTYPE
# ============================================================

Test-Status `
    -Name "Agregar TicketType al carrito" `
    -Method "POST" `
    -Url "$baseUrl/carts/$cartId/items" `
    -Body @{
        ticketTypeId = $ticketTypeId
        quantity = 2
    } `
    -ExpectedStatus 201 | Out-Null

# ============================================================
# 3. AGREGAR PRODUCTVARIANT
# ============================================================

$cart = Test-Status `
    -Name "Agregar ProductVariant al carrito" `
    -Method "POST" `
    -Url "$baseUrl/carts/$cartId/items" `
    -Body @{
        productVariantId = $productVariantId
        quantity = 2
    } `
    -ExpectedStatus 201

# ============================================================
# 4. CARRITO SIN PROMOCIÓN
# ============================================================

Test-Value `
    -Name "Subtotal sin promoción" `
    -Actual ([decimal]$cart.subtotal) `
    -Expected 150000

Test-Value `
    -Name "Descuento sin promoción" `
    -Actual ([decimal]$cart.discount) `
    -Expected 0

Test-Value `
    -Name "Total sin promoción" `
    -Actual ([decimal]$cart.total) `
    -Expected 150000

# ============================================================
# 5. CREAR PROMOCIÓN PORCENTUAL GLOBAL
# ============================================================

$promotionPercentage = Test-Status `
    -Name "Crear promoción PERCENTAGE global" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/promotions" `
    -Body @{
        name = "Pricing Percentage Test"
        description = "Promoción temporal para pricing"
        type = "PERCENTAGE"
        value = 10
        isActive = $true
        appliesToAll = $true
    } `
    -ExpectedStatus 201

$promotionPercentageId = $promotionPercentage.id

# ============================================================
# 6. APLICAR PROMOCIÓN PORCENTUAL
# ============================================================

$cart = Test-Status `
    -Name "Aplicar promoción PERCENTAGE" `
    -Method "PATCH" `
    -Url "$baseUrl/carts/$cartId" `
    -Body @{
        promotionId = $promotionPercentageId
    } `
    -ExpectedStatus 200

# 10% de 150000 = 15000
Test-Value `
    -Name "Descuento PERCENTAGE 10%" `
    -Actual ([decimal]$cart.discount) `
    -Expected 15000

Test-Value `
    -Name "Total con PERCENTAGE 10%" `
    -Actual ([decimal]$cart.total) `
    -Expected 135000

# ============================================================
# 7. CREAR PROMOCIÓN FIJA
# ============================================================

$promotionFixed = Test-Status `
    -Name "Crear promoción FIXED global" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/promotions" `
    -Body @{
        name = "Pricing Fixed Test"
        description = "Promoción temporal para pricing"
        type = "FIXED"
        value = 20000
        isActive = $true
        appliesToAll = $true
    } `
    -ExpectedStatus 201

$promotionFixedId = $promotionFixed.id

# ============================================================
# 8. APLICAR PROMOCIÓN FIJA
# ============================================================

$cart = Test-Status `
    -Name "Aplicar promoción FIXED" `
    -Method "PATCH" `
    -Url "$baseUrl/carts/$cartId" `
    -Body @{
        promotionId = $promotionFixedId
    } `
    -ExpectedStatus 200

Test-Value `
    -Name "Descuento FIXED $20000" `
    -Actual ([decimal]$cart.discount) `
    -Expected 20000

Test-Value `
    -Name "Total con FIXED $20000" `
    -Actual ([decimal]$cart.total) `
    -Expected 130000

# ============================================================
# 9. PROMOCIÓN CON MÍNIMO DE SUBTOTAL
# ============================================================

$promotionMinimum = Test-Status `
    -Name "Crear promoción con minSubtotal" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/promotions" `
    -Body @{
        name = "Pricing Minimum Test"
        description = "Promoción con subtotal mínimo"
        type = "PERCENTAGE"
        value = 20
        minSubtotal = 200000
        isActive = $true
        appliesToAll = $true
    } `
    -ExpectedStatus 201

$promotionMinimumId = $promotionMinimum.id

$cart = Test-Status `
    -Name "Aplicar promoción con minSubtotal no alcanzado" `
    -Method "PATCH" `
    -Url "$baseUrl/carts/$cartId" `
    -Body @{
        promotionId = $promotionMinimumId
    } `
    -ExpectedStatus 200

Test-Value `
    -Name "Descuento con minSubtotal no alcanzado" `
    -Actual ([decimal]$cart.discount) `
    -Expected 0

Test-Value `
    -Name "Total con minSubtotal no alcanzado" `
    -Actual ([decimal]$cart.total) `
    -Expected 150000

# ============================================================
# 10. PROMOCIÓN ESPECÍFICA PARA PRODUCTO
# ============================================================

$promotionSpecific = Test-Status `
    -Name "Crear promoción específica para Product" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/promotions" `
    -Body @{
        name = "Pricing Specific Product Test"
        description = "Promoción específica para producto"
        type = "PERCENTAGE"
        value = 10
        isActive = $true
        appliesToAll = $false
        productIds = @(1)
    } `
    -ExpectedStatus 201

$promotionSpecificId = $promotionSpecific.id

$cart = Test-Status `
    -Name "Aplicar promoción específica al producto" `
    -Method "PATCH" `
    -Url "$baseUrl/carts/$cartId" `
    -Body @{
        promotionId = $promotionSpecificId
    } `
    -ExpectedStatus 200

# Solo ProductVariant:
# 25000 x 2 = 50000
# 10% = 5000

Test-Value `
    -Name "Descuento específico del producto" `
    -Actual ([decimal]$cart.discount) `
    -Expected 5000

Test-Value `
    -Name "Total con promoción específica" `
    -Actual ([decimal]$cart.total) `
    -Expected 145000

# ============================================================
# 11. PROMOCIÓN INACTIVA
# ============================================================

$promotionInactive = Test-Status `
    -Name "Crear promoción inactiva" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/promotions" `
    -Body @{
        name = "Pricing Inactive Test"
        description = "Promoción inactiva"
        type = "PERCENTAGE"
        value = 50
        isActive = $false
        appliesToAll = $true
    } `
    -ExpectedStatus 201

$promotionInactiveId = $promotionInactive.id

Test-Status `
    -Name "Aplicar promoción inactiva" `
    -Method "PATCH" `
    -Url "$baseUrl/carts/$cartId" `
    -Body @{
        promotionId = $promotionInactiveId
    } `
    -ExpectedStatus 400 | Out-Null

# ============================================================
# 12. PROMOCIÓN FUERA DE FECHA
# ============================================================

$futureStart = (Get-Date).AddDays(1).ToUniversalTime().ToString("o")
$futureEnd = (Get-Date).AddDays(2).ToUniversalTime().ToString("o")

$promotionFuture = Test-Status `
    -Name "Crear promoción futura" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/promotions" `
    -Body @{
        name = "Pricing Future Test"
        description = "Promoción todavía no vigente"
        type = "PERCENTAGE"
        value = 50
        startsAt = $futureStart
        endsAt = $futureEnd
        isActive = $true
        appliesToAll = $true
    } `
    -ExpectedStatus 201

$promotionFutureId = $promotionFuture.id

$cart = Test-Status `
    -Name "Aplicar promoción futura" `
    -Method "PATCH" `
    -Url "$baseUrl/carts/$cartId" `
    -Body @{
        promotionId = $promotionFutureId
    } `
    -ExpectedStatus 200

Test-Value `
    -Name "Descuento con promoción futura" `
    -Actual ([decimal]$cart.discount) `
    -Expected 0

Test-Value `
    -Name "Total con promoción futura" `
    -Actual ([decimal]$cart.total) `
    -Expected 150000

# ============================================================
# 13. DESCUENTO MAYOR AL SUBTOTAL
# ============================================================

$promotionTooLarge = Test-Status `
    -Name "Crear promoción FIXED mayor al subtotal" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/promotions" `
    -Body @{
        name = "Pricing Max Discount Test"
        description = "Descuento mayor al subtotal"
        type = "FIXED"
        value = 999999
        isActive = $true
        appliesToAll = $true
    } `
    -ExpectedStatus 201

$promotionTooLargeId = $promotionTooLarge.id

$cart = Test-Status `
    -Name "Aplicar descuento mayor al subtotal" `
    -Method "PATCH" `
    -Url "$baseUrl/carts/$cartId" `
    -Body @{
        promotionId = $promotionTooLargeId
    } `
    -ExpectedStatus 200

# El descuento no puede superar $150000
Test-Value `
    -Name "Descuento limitado al subtotal" `
    -Actual ([decimal]$cart.discount) `
    -Expected 150000

Test-Value `
    -Name "Total mínimo del carrito" `
    -Actual ([decimal]$cart.total) `
    -Expected 0

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