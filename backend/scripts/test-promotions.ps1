$baseUrl = "http://localhost:3000"

$passed = 0
$failed = 0

$timestamp = Get-Date -Format "yyyyMMddHHmmss"

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
            $jsonBody = $Body | ConvertTo-Json -Depth 10
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

Write-Host ""
Write-Host "========================================"
Write-Host "CREANDO DATOS DE APOYO"
Write-Host "========================================"


# ------------------------------------------------------------
# 1. Crear evento principal
# Template 2 permite promociones + productos
# ------------------------------------------------------------

$eventResponse = Test-Request `
    -Name "Crear evento principal" `
    -Method "POST" `
    -Url "$baseUrl/events" `
    -Body @{
        name = "Evento Test Promotions $timestamp"
        description = "Evento para probar promociones"
        date = "2027-12-15T20:00:00.000Z"
        organizerId = 1
        templateId = 2
    } `
    -ExpectedStatus 201

$event = $eventResponse.Content | ConvertFrom-Json
$eventId = $event.id

Write-Host "Evento principal ID: $eventId"


# ------------------------------------------------------------
# 2. Crear segundo evento
# ------------------------------------------------------------

$event2Response = Test-Request `
    -Name "Crear segundo evento" `
    -Method "POST" `
    -Url "$baseUrl/events" `
    -Body @{
        name = "Evento Test Promotions Secundario $timestamp"
        description = "Segundo evento para pruebas"
        date = "2027-12-20T20:00:00.000Z"
        organizerId = 1
        templateId = 2
    } `
    -ExpectedStatus 201

$event2 = $event2Response.Content | ConvertFrom-Json
$event2Id = $event2.id

Write-Host "Segundo evento ID: $event2Id"


# ------------------------------------------------------------
# 3. Crear categoría de producto
# ------------------------------------------------------------

$categoryResponse = Test-Request `
    -Name "Crear categoría de producto" `
    -Method "POST" `
    -Url "$baseUrl/product-categories" `
    -Body @{
        name = "Categoría Test Promotions $timestamp"
        description = "Categoría temporal para pruebas"
    } `
    -ExpectedStatus 201

$category = $categoryResponse.Content | ConvertFrom-Json
$categoryId = $category.id

Write-Host "Categoría ID: $categoryId"


# ------------------------------------------------------------
# 4. Crear TicketType en evento principal
# ------------------------------------------------------------

$ticketResponse = Test-Request `
    -Name "Crear TicketType del evento principal" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/ticket-types" `
    -Body @{
        name = "VIP Test Promotions"
        description = "Entrada VIP para pruebas"
        price = 150000
        quantity = 100
    } `
    -ExpectedStatus 201

$ticket = $ticketResponse.Content | ConvertFrom-Json
$ticketTypeId = $ticket.id

Write-Host "TicketType principal ID: $ticketTypeId"


# ------------------------------------------------------------
# 5. Crear Product en evento principal
# ------------------------------------------------------------

$productResponse = Test-Request `
    -Name "Crear Product del evento principal" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/products" `
    -Body @{
        name = "Camiseta Test Promotions"
        description = "Producto para pruebas"
        gender = "UNISEX"
        categoryId = $categoryId
    } `
    -ExpectedStatus 201

$product = $productResponse.Content | ConvertFrom-Json
$productId = $product.id

Write-Host "Product principal ID: $productId"


# ------------------------------------------------------------
# 6. Crear TicketType en segundo evento
# ------------------------------------------------------------

$ticket2Response = Test-Request `
    -Name "Crear TicketType del segundo evento" `
    -Method "POST" `
    -Url "$baseUrl/events/$event2Id/ticket-types" `
    -Body @{
        name = "VIP Segundo Evento"
        description = "TicketType de otro evento"
        price = 120000
        quantity = 50
    } `
    -ExpectedStatus 201

$ticket2 = $ticket2Response.Content | ConvertFrom-Json
$ticketType2Id = $ticket2.id

Write-Host "TicketType secundario ID: $ticketType2Id"


# ------------------------------------------------------------
# 7. Crear Product en segundo evento
# ------------------------------------------------------------

$product2Response = Test-Request `
    -Name "Crear Product del segundo evento" `
    -Method "POST" `
    -Url "$baseUrl/events/$event2Id/products" `
    -Body @{
        name = "Producto Segundo Evento"
        description = "Producto de otro evento"
        gender = "UNISEX"
        categoryId = $categoryId
    } `
    -ExpectedStatus 201

$product2 = $product2Response.Content | ConvertFrom-Json
$product2Id = $product2.id

Write-Host "Product secundario ID: $product2Id"


# ============================================================
# TESTS DE PROMOTIONS
# ============================================================


# ============================================================
# 1. Crear promoción global → 201
# ============================================================

$globalPromotionResponse = Test-Request `
    -Name "1. Crear promoción global" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/promotions" `
    -Body @{
        name = "BLACK FRIDAY TEST"
        description = "Promoción global de prueba"
        code = "BLACKTEST"
        type = "PERCENTAGE"
        value = 20
        minSubtotal = 100000
        startsAt = "2027-11-01T00:00:00.000Z"
        endsAt = "2027-12-31T23:59:59.000Z"
        maxUses = 500
        isActive = $true
        appliesToAll = $true
    } `
    -ExpectedStatus 201

$globalPromotion = $globalPromotionResponse.Content | ConvertFrom-Json
$globalPromotionId = $globalPromotion.id

Write-Host "Promoción global ID: $globalPromotionId"


# ============================================================
# 2. Crear promoción específica → 201
# ============================================================

$specificPromotionResponse = Test-Request `
    -Name "2. Crear promoción específica" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/promotions" `
    -Body @{
        name = "VIP TEST"
        description = "Promoción específica"
        code = "VIPTEST"
        type = "PERCENTAGE"
        value = 15
        minSubtotal = 50000
        startsAt = "2027-11-01T00:00:00.000Z"
        endsAt = "2027-12-31T23:59:59.000Z"
        isActive = $true
        appliesToAll = $false
        ticketTypeIds = @($ticketTypeId)
        productIds = @($productId)
    } `
    -ExpectedStatus 201

$specificPromotion = $specificPromotionResponse.Content | ConvertFrom-Json
$specificPromotionId = $specificPromotion.id

Write-Host "Promoción específica ID: $specificPromotionId"


# ============================================================
# 3. GET promociones del evento → 200
# ============================================================

Test-Request `
    -Name "3. GET promociones del evento" `
    -Method "GET" `
    -Url "$baseUrl/events/$eventId/promotions" `
    -ExpectedStatus 200


# ============================================================
# 4. GET promoción individual → 200
# ============================================================

Test-Request `
    -Name "4. GET promoción individual" `
    -Method "GET" `
    -Url "$baseUrl/promotions/$specificPromotionId" `
    -ExpectedStatus 200


# ============================================================
# 5. Global + IDs específicos → 400
# ============================================================

Test-Request `
    -Name "5. Global + IDs específicos" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/promotions" `
    -Body @{
        name = "Promoción inválida global"
        type = "PERCENTAGE"
        value = 10
        appliesToAll = $true
        ticketTypeIds = @($ticketTypeId)
    } `
    -ExpectedStatus 400


# ============================================================
# 6. Específica sin productos/entradas → 400
# ============================================================

Test-Request `
    -Name "6. Específica sin productos ni entradas" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/promotions" `
    -Body @{
        name = "Promoción inválida específica"
        type = "PERCENTAGE"
        value = 10
        appliesToAll = $false
    } `
    -ExpectedStatus 400


# ============================================================
# 7. TicketType de otro evento → 404
# ============================================================

Test-Request `
    -Name "7. TicketType de otro evento" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/promotions" `
    -Body @{
        name = "Promoción TicketType incorrecto"
        type = "PERCENTAGE"
        value = 10
        appliesToAll = $false
        ticketTypeIds = @($ticketType2Id)
    } `
    -ExpectedStatus 404


# ============================================================
# 8. Product de otro evento → 404
# ============================================================

Test-Request `
    -Name "8. Product de otro evento" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/promotions" `
    -Body @{
        name = "Promoción Product incorrecto"
        type = "PERCENTAGE"
        value = 10
        appliesToAll = $false
        productIds = @($product2Id)
    } `
    -ExpectedStatus 404


# ============================================================
# 9. Fecha inicio >= fecha fin → 400
# ============================================================

Test-Request `
    -Name "9. Fecha inicio mayor o igual a fecha fin" `
    -Method "POST" `
    -Url "$baseUrl/events/$eventId/promotions" `
    -Body @{
        name = "Promoción fechas inválidas"
        type = "PERCENTAGE"
        value = 10
        appliesToAll = $true
        startsAt = "2027-12-31T23:59:59.000Z"
        endsAt = "2027-11-01T00:00:00.000Z"
    } `
    -ExpectedStatus 400


# ============================================================
# 10. PATCH promoción → 200
# ============================================================

Test-Request `
    -Name "10. PATCH promoción" `
    -Method "PATCH" `
    -Url "$baseUrl/promotions/$specificPromotionId" `
    -Body @{
        name = "VIP TEST ACTUALIZADA"
        value = 25
        appliesToAll = $true
    } `
    -ExpectedStatus 200


# ============================================================
# 11. DELETE promoción → 200
# ============================================================

Test-Request `
    -Name "11. DELETE promoción" `
    -Method "DELETE" `
    -Url "$baseUrl/promotions/$globalPromotionId" `
    -ExpectedStatus 200


# ============================================================
# 12. DELETE inexistente → 404
# ============================================================

Test-Request `
    -Name "12. DELETE promoción inexistente" `
    -Method "DELETE" `
    -Url "$baseUrl/promotions/999999" `
    -ExpectedStatus 404


# ============================================================
# RESULTADO FINAL
# ============================================================

Write-Host ""
Write-Host "========================================"
Write-Host "RESULTADO FINAL"
Write-Host "========================================"

Write-Host "PASS:  $passed"
Write-Host "FAIL:  $failed"

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "TODOS LOS TESTS PASARON"
}
else {
    Write-Host ""
    Write-Host "HAY TESTS FALLIDOS"
}