
$BaseUrl = "http://localhost:3000"

$passed = 0
$failed = 0

# =========================================================
# FUNCIONES AUXILIARES
# =========================================================

function Test-Status {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Uri,
        [int]$ExpectedStatus,
        $Body = $null
    )

    Write-Host ""
    Write-Host "TEST: $Name"

    try {

        if ($null -ne $Body) {
            $httpResponse = Invoke-WebRequest `
                -Uri $Uri `
                -Method $Method `
                -ContentType "application/json" `
                -Body ($Body | ConvertTo-Json -Depth 10) `
                -UseBasicParsing `
                -TimeoutSec 15
        }
        else {
            $httpResponse = Invoke-WebRequest `
                -Uri $Uri `
                -Method $Method `
                -UseBasicParsing `
                -TimeoutSec 15
        }

        $status = [int]$httpResponse.StatusCode

        Write-Host "Status recibido:  $status"
        Write-Host "Status esperado: $ExpectedStatus"

        if ($status -eq $ExpectedStatus) {
            Write-Host "PASS"
            $script:passed++
        }
        else {
            Write-Host "FAIL"
            $script:failed++
        }

        if ($httpResponse.Content) {
            try {
                return ($httpResponse.Content | ConvertFrom-Json)
            }
            catch {
                return $httpResponse.Content
            }
        }

        return $null
    }
    catch {

        $status = 0

        if ($_.Exception.Response) {
            try {
                $status = [int]$_.Exception.Response.StatusCode
            }
            catch {
                $status = 0
            }
        }

        Write-Host "Status recibido:  $status"
        Write-Host "Status esperado: $ExpectedStatus"

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
    param(
        [string]$Name,
        $Actual,
        $Expected
    )

    Write-Host ""
    Write-Host "TEST: $Name"
    Write-Host "Valor recibido:  $Actual"
    Write-Host "Valor esperado: $Expected"

    if ("$Actual" -eq "$Expected") {
        Write-Host "PASS"
        $script:passed++
    }
    else {
        Write-Host "FAIL"
        $script:failed++
    }
}

function Test-NotNullValue {
    param(
        [string]$Name,
        $Actual
    )

    Write-Host ""
    Write-Host "TEST: $Name"
    Write-Host "Valor recibido: $Actual"

    if ($null -ne $Actual -and "$Actual" -ne "") {
        Write-Host "PASS"
        $script:passed++
    }
    else {
        Write-Host "FAIL"
        $script:failed++
    }
}

# =========================================================
# INICIO
# =========================================================

Write-Host "========================================="
Write-Host "TEST DE RESERVATIONS"
Write-Host "========================================="

# =========================================================
# DATOS BASE
# =========================================================

$userId = 1
$eventId = 5
$ticketTypeId = 3

Write-Host ""
Write-Host "Usuario: $userId"
Write-Host "Evento: $eventId"
Write-Host "TicketType: $ticketTypeId"

# =========================================================
# FLUJO 1 - RESERVATION PENDING
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 1 - RESERVATION PENDING"
Write-Host "========================================="

# ---------------------------------------------------------
# 1. CREAR CART
# ---------------------------------------------------------

$cart = Test-Status `
    -Name "Crear carrito para Reservation" `
    -Method "POST" `
    -Uri "$BaseUrl/users/$userId/cart" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
    }

if ($null -eq $cart) {
    Write-Host "No se pudo crear el Cart."
    exit
}

$cartId = $cart.id

Write-Host "Cart creado: $cartId"

# ---------------------------------------------------------
# 2. AGREGAR TICKETTYPE
# ---------------------------------------------------------

$cartItem = Test-Status `
    -Name "Agregar TicketType al carrito" `
    -Method "POST" `
    -Uri "$BaseUrl/carts/$cartId/items" `
    -ExpectedStatus 201 `
    -Body @{
        ticketTypeId = $ticketTypeId
        quantity = 1
    }

if ($null -eq $cartItem) {
    Write-Host "No se pudo agregar el TicketType."
    exit
}

# ---------------------------------------------------------
# 3. CREAR RESERVATION
# ---------------------------------------------------------

$reservation = Test-Status `
    -Name "Crear Reservation correctamente" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
        cartId = $cartId
    }

if ($null -eq $reservation) {
    Write-Host "No se pudo crear la Reservation."
    exit
}

$reservationId = $reservation.id

Write-Host "Reservation creada: $reservationId"
Write-Host "Estado: $($reservation.status)"
Write-Host "Expira: $($reservation.expiresAt)"

# ---------------------------------------------------------
# 4. PENDING
# ---------------------------------------------------------

Test-Value `
    -Name "Reservation inicia en PENDING" `
    -Actual $reservation.status `
    -Expected "PENDING"

# ---------------------------------------------------------
# 5. EXPIRESAT
# ---------------------------------------------------------

Test-NotNullValue `
    -Name "Reservation tiene expiresAt" `
    -Actual $reservation.expiresAt

# ---------------------------------------------------------
# 6. GET RESERVATION
# ---------------------------------------------------------

$foundReservation = Test-Status `
    -Name "Obtener Reservation por ID" `
    -Method "GET" `
    -Uri "$BaseUrl/reservations/$reservationId" `
    -ExpectedStatus 200

# ---------------------------------------------------------
# 7. LISTAR DEL USUARIO
# ---------------------------------------------------------

Test-Status `
    -Name "Listar Reservations del usuario" `
    -Method "GET" `
    -Uri "$BaseUrl/users/$userId/reservations" `
    -ExpectedStatus 200

# ---------------------------------------------------------
# 8. PENDING -> PENDING
# ---------------------------------------------------------

$pendingReservation = Test-Status `
    -Name "Mantener Reservation en PENDING" `
    -Method "PATCH" `
    -Uri "$BaseUrl/reservations/$reservationId" `
    -ExpectedStatus 200 `
    -Body @{
        status = "PENDING"
    }

if ($null -ne $pendingReservation) {

    Test-Value `
        -Name "Reservation sigue en PENDING" `
        -Actual $pendingReservation.status `
        -Expected "PENDING"
}

# ---------------------------------------------------------
# 9. PENDING -> CANCELLED
# ---------------------------------------------------------

$cancelledReservation = Test-Status `
    -Name "Cancelar Reservation PENDING" `
    -Method "PATCH" `
    -Uri "$BaseUrl/reservations/$reservationId" `
    -ExpectedStatus 200 `
    -Body @{
        status = "CANCELLED"
    }

if ($null -ne $cancelledReservation) {

    Test-Value `
        -Name "Reservation cambia a CANCELLED" `
        -Actual $cancelledReservation.status `
        -Expected "CANCELLED"
}

# =========================================================
# FLUJO 2 - VALIDACIONES
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 2 - VALIDACIONES"
Write-Host "========================================="

# ---------------------------------------------------------
# 10. USUARIO INEXISTENTE
# ---------------------------------------------------------

Test-Status `
    -Name "Crear Reservation con usuario inexistente" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations" `
    -ExpectedStatus 404 `
    -Body @{
        userId = 999999
        eventId = $eventId
        cartId = $cartId
    }

# ---------------------------------------------------------
# 11. EVENTO INEXISTENTE
# ---------------------------------------------------------

Test-Status `
    -Name "Crear Reservation con evento inexistente" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations" `
    -ExpectedStatus 404 `
    -Body @{
        userId = $userId
        eventId = 999999
        cartId = $cartId
    }

# ---------------------------------------------------------
# 12. CART INEXISTENTE
# ---------------------------------------------------------

Test-Status `
    -Name "Crear Reservation con carrito inexistente" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations" `
    -ExpectedStatus 404 `
    -Body @{
        userId = $userId
        eventId = $eventId
        cartId = 999999
    }

# ---------------------------------------------------------
# 13. CART DE OTRO USUARIO
# ---------------------------------------------------------

$otherUserCart = Test-Status `
    -Name "Crear carrito de otro usuario" `
    -Method "POST" `
    -Uri "$BaseUrl/users/2/cart" `
    -ExpectedStatus 201 `
    -Body @{
        userId = 2
        eventId = $eventId
    }

if ($null -ne $otherUserCart) {

    $otherCartId = $otherUserCart.id

    Test-Status `
        -Name "Reservation con carrito de otro usuario" `
        -Method "POST" `
        -Uri "$BaseUrl/reservations" `
        -ExpectedStatus 400 `
        -Body @{
            userId = $userId
            eventId = $eventId
            cartId = $otherCartId
        }
}

# ---------------------------------------------------------
# 14. CART DE OTRO EVENTO
# ---------------------------------------------------------

$otherEventCart = Test-Status `
    -Name "Crear carrito de otro evento" `
    -Method "POST" `
    -Uri "$BaseUrl/users/$userId/cart" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = 6
    }

if ($null -ne $otherEventCart) {

    $otherEventCartId = $otherEventCart.id

    Test-Status `
        -Name "Reservation con carrito de otro evento" `
        -Method "POST" `
        -Uri "$BaseUrl/reservations" `
        -ExpectedStatus 400 `
        -Body @{
            userId = $userId
            eventId = $eventId
            cartId = $otherEventCartId
        }
}

# ---------------------------------------------------------
# 15. CART VACIO
# ---------------------------------------------------------

$emptyCart = Test-Status `
    -Name "Crear carrito vacío" `
    -Method "POST" `
    -Uri "$BaseUrl/users/$userId/cart" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
    }

if ($null -ne $emptyCart) {

    $emptyCartId = $emptyCart.id

    Test-Status `
        -Name "Reservation con carrito vacío" `
        -Method "POST" `
        -Uri "$BaseUrl/reservations" `
        -ExpectedStatus 400 `
        -Body @{
            userId = $userId
            eventId = $eventId
            cartId = $emptyCartId
        }
}

# ---------------------------------------------------------
# 16. RESERVATION DUPLICADA
# ---------------------------------------------------------

Test-Status `
    -Name "Reservation duplicada para el mismo carrito" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations" `
    -ExpectedStatus 400 `
    -Body @{
        userId = $userId
        eventId = $eventId
        cartId = $cartId
    }

# ---------------------------------------------------------
# 17. RESERVATION INEXISTENTE
# ---------------------------------------------------------

Test-Status `
    -Name "Obtener Reservation inexistente" `
    -Method "GET" `
    -Uri "$BaseUrl/reservations/999999" `
    -ExpectedStatus 404

# ---------------------------------------------------------
# 18. ACTUALIZAR INEXISTENTE
# ---------------------------------------------------------

Test-Status `
    -Name "Actualizar Reservation inexistente" `
    -Method "PATCH" `
    -Uri "$BaseUrl/reservations/999999" `
    -ExpectedStatus 404 `
    -Body @{
        status = "CANCELLED"
    }

# ---------------------------------------------------------
# 19. CANCELLED -> PENDING
# ---------------------------------------------------------

Test-Status `
    -Name "No cambiar Reservation CANCELLED a PENDING" `
    -Method "PATCH" `
    -Uri "$BaseUrl/reservations/$reservationId" `
    -ExpectedStatus 400 `
    -Body @{
        status = "PENDING"
    }

# ---------------------------------------------------------
# 20. CANCELLED -> CANCELLED
# ---------------------------------------------------------

Test-Status `
    -Name "No modificar Reservation ya CANCELLED" `
    -Method "PATCH" `
    -Uri "$BaseUrl/reservations/$reservationId" `
    -ExpectedStatus 400 `
    -Body @{
        status = "CANCELLED"
    }

# ---------------------------------------------------------
# 21. ELIMINAR RESERVATION CANCELLED
# ---------------------------------------------------------

Test-Status `
    -Name "Eliminar Reservation CANCELLED" `
    -Method "DELETE" `
    -Uri "$BaseUrl/reservations/$reservationId" `
    -ExpectedStatus 200

# ---------------------------------------------------------
# 22. ELIMINAR RESERVATION INEXISTENTE
# ---------------------------------------------------------

Test-Status `
    -Name "Eliminar Reservation inexistente" `
    -Method "DELETE" `
    -Uri "$BaseUrl/reservations/$reservationId" `
    -ExpectedStatus 404

# =========================================================
# FLUJO 3 - RESERVATION CONFIRMED
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 3 - RESERVATION CONFIRMED"
Write-Host "========================================="

# ---------------------------------------------------------
# 23. CREAR CART PARA CONFIRMED
# ---------------------------------------------------------

$confirmedCart = Test-Status `
    -Name "Crear carrito para Reservation CONFIRMED" `
    -Method "POST" `
    -Uri "$BaseUrl/users/$userId/cart" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
    }

if ($null -eq $confirmedCart) {
    Write-Host "No se pudo crear el Cart para CONFIRMED."
    exit
}

$confirmedCartId = $confirmedCart.id

# ---------------------------------------------------------
# 24. AGREGAR TICKETTYPE
# ---------------------------------------------------------

Test-Status `
    -Name "Agregar TicketType al carrito CONFIRMED" `
    -Method "POST" `
    -Uri "$BaseUrl/carts/$confirmedCartId/items" `
    -ExpectedStatus 201 `
    -Body @{
        ticketTypeId = $ticketTypeId
        quantity = 1
    }

# ---------------------------------------------------------
# 25. CREAR RESERVATION
# ---------------------------------------------------------

$confirmedReservation = Test-Status `
    -Name "Crear Reservation para flujo CONFIRMED" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
        cartId = $confirmedCartId
    }

if ($null -eq $confirmedReservation) {
    Write-Host "No se pudo crear la Reservation CONFIRMED."
    exit
}

$confirmedReservationId = $confirmedReservation.id

Test-Value `
    -Name "Reservation para compra inicia en PENDING" `
    -Actual $confirmedReservation.status `
    -Expected "PENDING"

# ---------------------------------------------------------
# 26. CREAR ORDER
# ---------------------------------------------------------

$confirmedOrder = Test-Status `
    -Name "Crear Order para Reservation CONFIRMED" `
    -Method "POST" `
    -Uri "$BaseUrl/orders" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
        reservationId = $confirmedReservationId
    }

if ($null -eq $confirmedOrder) {
    Write-Host "No se pudo crear la Order."
    exit
}

$confirmedOrderId = $confirmedOrder.id

Test-Value `
    -Name "Order inicia en PENDING" `
    -Actual $confirmedOrder.status `
    -Expected "PENDING"

# ---------------------------------------------------------
# 27. CREAR PAYMENT
# ---------------------------------------------------------

$confirmedPayment = Test-Status `
    -Name "Crear Payment para confirmar Reservation" `
    -Method "POST" `
    -Uri "$BaseUrl/payments" `
    -ExpectedStatus 201 `
    -Body @{
        orderId = $confirmedOrderId
    }

if ($null -eq $confirmedPayment) {
    Write-Host "No se pudo crear el Payment."
    exit
}

$confirmedPaymentId = $confirmedPayment.id

Test-Value `
    -Name "Payment inicia en PENDING" `
    -Actual $confirmedPayment.status `
    -Expected "PENDING"

# ---------------------------------------------------------
# 28. APROBAR PAYMENT
# ---------------------------------------------------------

$approvedPayment = Test-Status `
    -Name "Aprobar Payment para confirmar Reservation" `
    -Method "PATCH" `
    -Uri "$BaseUrl/payments/$confirmedPaymentId" `
    -ExpectedStatus 200 `
    -Body @{
        status = "APPROVED"
    }

if ($null -eq $approvedPayment) {
    Write-Host "No se pudo aprobar el Payment."
    exit
}

Test-Value `
    -Name "Payment cambia a APPROVED" `
    -Actual $approvedPayment.status `
    -Expected "APPROVED"

# ---------------------------------------------------------
# 29. VERIFICAR RESERVATION CONFIRMED
# ---------------------------------------------------------

$confirmedReservationCheck = Test-Status `
    -Name "Obtener Reservation despues de aprobar Payment" `
    -Method "GET" `
    -Uri "$BaseUrl/reservations/$confirmedReservationId" `
    -ExpectedStatus 200

if ($null -ne $confirmedReservationCheck) {

    Test-Value `
        -Name "Payment APPROVED cambia Reservation a CONFIRMED" `
        -Actual $confirmedReservationCheck.status `
        -Expected "CONFIRMED"
}

# ---------------------------------------------------------
# 30. CONFIRMED -> PENDING
# ---------------------------------------------------------

Test-Status `
    -Name "No cambiar Reservation CONFIRMED a PENDING" `
    -Method "PATCH" `
    -Uri "$BaseUrl/reservations/$confirmedReservationId" `
    -ExpectedStatus 400 `
    -Body @{
        status = "PENDING"
    }

# ---------------------------------------------------------
# 31. CONFIRMED -> CANCELLED
# ---------------------------------------------------------

Test-Status `
    -Name "No cancelar Reservation CONFIRMED" `
    -Method "PATCH" `
    -Uri "$BaseUrl/reservations/$confirmedReservationId" `
    -ExpectedStatus 400 `
    -Body @{
        status = "CANCELLED"
    }

# ---------------------------------------------------------
# 32. CONFIRMED -> CONFIRMED MANUAL
# ---------------------------------------------------------

Test-Status `
    -Name "No establecer CONFIRMED manualmente desde Reservations" `
    -Method "PATCH" `
    -Uri "$BaseUrl/reservations/$confirmedReservationId" `
    -ExpectedStatus 400 `
    -Body @{
        status = "CONFIRMED"
    }

# ---------------------------------------------------------
# 33. DELETE CONFIRMED
# ---------------------------------------------------------

Test-Status `
    -Name "No eliminar Reservation CONFIRMED" `
    -Method "DELETE" `
    -Uri "$BaseUrl/reservations/$confirmedReservationId" `
    -ExpectedStatus 400

# =========================================================
# RESULTADO FINAL
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "RESULTADO FINAL"
Write-Host "========================================="
Write-Host "PASS: $passed"
Write-Host "FAIL: $failed"

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "TODOS LOS TESTS PASARON" -ForegroundColor Green
}
else {
    Write-Host ""
    Write-Host "HAY TESTS FALLIDOS" -ForegroundColor Red
}

