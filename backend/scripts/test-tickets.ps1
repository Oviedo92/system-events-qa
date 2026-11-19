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
            $response = Invoke-WebRequest `
                -Uri $Uri `
                -Method $Method `
                -ContentType "application/json" `
                -Body ($Body | ConvertTo-Json -Depth 10) `
                -UseBasicParsing `
                -TimeoutSec 15
        }
        else {
            $response = Invoke-WebRequest `
                -Uri $Uri `
                -Method $Method `
                -UseBasicParsing `
                -TimeoutSec 15
        }

        $status = [int]$response.StatusCode

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

        if ($response.Content) {
            try {
                return ($response.Content | ConvertFrom-Json)
            }
            catch {
                return $response.Content
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

function Test-NullValue {
    param(
        [string]$Name,
        $Actual
    )

    Write-Host ""
    Write-Host "TEST: $Name"
    Write-Host "Valor recibido: $Actual"

    if ($null -eq $Actual -or "$Actual" -eq "") {
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
Write-Host "TEST DE TICKETS"
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
# FLUJO 1
# EMISION AUTOMATICA
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 1 - EMISION AUTOMATICA"
Write-Host "========================================="

# ---------------------------------------------------------
# 1. CART
# ---------------------------------------------------------

$cart = Test-Status `
    -Name "Crear Cart para Ticket" `
    -Method "POST" `
    -Uri "$BaseUrl/users/$userId/cart" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
    }

if ($null -eq $cart) {
    exit
}

$cartId = $cart.id

# ---------------------------------------------------------
# 2. CART ITEM
# ---------------------------------------------------------

$cartItem = Test-Status `
    -Name "Agregar TicketType al Cart" `
    -Method "POST" `
    -Uri "$BaseUrl/carts/$cartId/items" `
    -ExpectedStatus 201 `
    -Body @{
        ticketTypeId = $ticketTypeId
        quantity = 1
    }

if ($null -eq $cartItem) {
    exit
}

# ---------------------------------------------------------
# 3. RESERVATION
# ---------------------------------------------------------

$reservation = Test-Status `
    -Name "Crear Reservation" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
        cartId = $cartId
    }

if ($null -eq $reservation) {
    exit
}

$reservationId = $reservation.id

Test-Value `
    -Name "Reservation inicia en PENDING" `
    -Actual $reservation.status `
    -Expected "PENDING"

# ---------------------------------------------------------
# 4. ORDER
# ---------------------------------------------------------

$order = Test-Status `
    -Name "Crear Order" `
    -Method "POST" `
    -Uri "$BaseUrl/orders" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
        reservationId = $reservationId
    }

if ($null -eq $order) {
    exit
}

$orderId = $order.id

Test-Value `
    -Name "Order inicia en PENDING" `
    -Actual $order.status `
    -Expected "PENDING"

# ---------------------------------------------------------
# 5. PAYMENT
# ---------------------------------------------------------

$payment = Test-Status `
    -Name "Crear Payment" `
    -Method "POST" `
    -Uri "$BaseUrl/payments" `
    -ExpectedStatus 201 `
    -Body @{
        orderId = $orderId
    }

if ($null -eq $payment) {
    exit
}

$paymentId = $payment.id

Test-Value `
    -Name "Payment inicia en PENDING" `
    -Actual $payment.status `
    -Expected "PENDING"

# ---------------------------------------------------------
# 6. APPROVED
# ---------------------------------------------------------

$approvedPayment = Test-Status `
    -Name "Aprobar Payment" `
    -Method "PATCH" `
    -Uri "$BaseUrl/payments/$paymentId" `
    -ExpectedStatus 200 `
    -Body @{
        status = "APPROVED"
    }

if ($null -eq $approvedPayment) {
    exit
}

Test-Value `
    -Name "Payment queda APPROVED" `
    -Actual $approvedPayment.status `
    -Expected "APPROVED"

# ---------------------------------------------------------
# 7. ORDER PAID
# ---------------------------------------------------------

$updatedOrder = Test-Status `
    -Name "Obtener Order despues del Payment" `
    -Method "GET" `
    -Uri "$BaseUrl/orders/$orderId" `
    -ExpectedStatus 200

if ($null -eq $updatedOrder) {
    exit
}

Test-Value `
    -Name "Order queda PAID" `
    -Actual $updatedOrder.status `
    -Expected "PAID"

# ---------------------------------------------------------
# 8. RESERVATION CONFIRMED
# ---------------------------------------------------------

$updatedReservation = Test-Status `
    -Name "Obtener Reservation despues del Payment" `
    -Method "GET" `
    -Uri "$BaseUrl/reservations/$reservationId" `
    -ExpectedStatus 200

if ($null -eq $updatedReservation) {
    exit
}

Test-Value `
    -Name "Reservation queda CONFIRMED" `
    -Actual $updatedReservation.status `
    -Expected "CONFIRMED"

# =========================================================
# FLUJO 2 - TICKET
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 2 - TICKET"
Write-Host "========================================="

# ---------------------------------------------------------
# 9. LISTAR TICKETS DE LA ORDER
# ---------------------------------------------------------

$tickets = Test-Status `
    -Name "Obtener Tickets de la Order" `
    -Method "GET" `
    -Uri "$BaseUrl/orders/$orderId/tickets" `
    -ExpectedStatus 200

if ($null -eq $tickets) {
    exit
}

$ticketList = @($tickets)

Test-Value `
    -Name "La Order genera exactamente un Ticket" `
    -Actual $ticketList.Count `
    -Expected 1

if ($ticketList.Count -eq 0) {
    exit
}

$ticket = $ticketList[0]
$ticketId = $ticket.id
$ticketCode = $ticket.code

# ---------------------------------------------------------
# 10. STATUS ACTIVE
# ---------------------------------------------------------

Test-Value `
    -Name "Ticket inicia en ACTIVE" `
    -Actual $ticket.status `
    -Expected "ACTIVE"

# ---------------------------------------------------------
# 11. CODE
# ---------------------------------------------------------

Test-NotNullValue `
    -Name "Ticket tiene code" `
    -Actual $ticket.code

# ---------------------------------------------------------
# 12. ISSUED AT
# ---------------------------------------------------------

Test-NotNullValue `
    -Name "Ticket tiene issuedAt" `
    -Actual $ticket.issuedAt

# ---------------------------------------------------------
# 13. USED AT
# ---------------------------------------------------------

Test-NullValue `
    -Name "Ticket inicia sin usedAt" `
    -Actual $ticket.usedAt

# ---------------------------------------------------------
# 14. USER
# ---------------------------------------------------------

Test-Value `
    -Name "Ticket pertenece al usuario correcto" `
    -Actual $ticket.userId `
    -Expected $userId

# ---------------------------------------------------------
# 15. EVENT
# ---------------------------------------------------------

Test-Value `
    -Name "Ticket pertenece al evento correcto" `
    -Actual $ticket.eventId `
    -Expected $eventId

# ---------------------------------------------------------
# 16. ORDER
# ---------------------------------------------------------

Test-Value `
    -Name "Ticket pertenece a la Order correcta" `
    -Actual $ticket.orderId `
    -Expected $orderId

# ---------------------------------------------------------
# 17. TICKETTYPE
# ---------------------------------------------------------

Test-Value `
    -Name "Ticket pertenece al TicketType correcto" `
    -Actual $ticket.ticketTypeId `
    -Expected $ticketTypeId

# ---------------------------------------------------------
# 18. ORDER ITEM
# ---------------------------------------------------------

Test-NotNullValue `
    -Name "Ticket tiene OrderItem asociado" `
    -Actual $ticket.orderItemId

# ---------------------------------------------------------
# 19. GET TICKET
# ---------------------------------------------------------

$foundTicket = Test-Status `
    -Name "Obtener Ticket por ID" `
    -Method "GET" `
    -Uri "$BaseUrl/tickets/$ticketId" `
    -ExpectedStatus 200

if ($null -ne $foundTicket) {

    Test-Value `
        -Name "Ticket consultado mantiene ACTIVE" `
        -Actual $foundTicket.status `
        -Expected "ACTIVE"
}

# ---------------------------------------------------------
# 20. LISTAR TICKETS DEL USUARIO
# ---------------------------------------------------------

$userTickets = Test-Status `
    -Name "Listar Tickets del usuario" `
    -Method "GET" `
    -Uri "$BaseUrl/users/$userId/tickets" `
    -ExpectedStatus 200

if ($null -ne $userTickets) {

    $userTicketList = @($userTickets)

    if ($userTicketList.Count -gt 0) {
        Write-Host ""
        Write-Host "TEST: Usuario tiene Tickets"
        Write-Host "Tickets encontrados: $($userTicketList.Count)"
        Write-Host "PASS"
        $passed++
    }
    else {
        Write-Host ""
        Write-Host "TEST: Usuario tiene Tickets"
        Write-Host "Tickets encontrados: 0"
        Write-Host "FAIL"
        $failed++
    }
}

# =========================================================
# FLUJO 3 - VALIDACION / CONSUMO
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 3 - VALIDACION DEL TICKET"
Write-Host "========================================="

# ---------------------------------------------------------
# 21. VALIDAR TICKET POR CODE
# ---------------------------------------------------------

$validatedTicket = Test-Status `
    -Name "Validar Ticket por code" `
    -Method "POST" `
    -Uri "$BaseUrl/tickets/validate" `
    -ExpectedStatus 200 `
    -Body @{
        code = $ticketCode
    }

if ($null -eq $validatedTicket) {
    exit
}

# ---------------------------------------------------------
# 22. TICKET USED
# ---------------------------------------------------------

Test-Value `
    -Name "Ticket cambia a USED" `
    -Actual $validatedTicket.status `
    -Expected "USED"

# ---------------------------------------------------------
# 23. USED AT
# ---------------------------------------------------------

Test-NotNullValue `
    -Name "Ticket genera usedAt" `
    -Actual $validatedTicket.usedAt

# ---------------------------------------------------------
# 24. CODE SE MANTIENE
# ---------------------------------------------------------

Test-Value `
    -Name "Ticket conserva el mismo code" `
    -Actual $validatedTicket.code `
    -Expected $ticketCode

# ---------------------------------------------------------
# 25. OBTENER TICKET DESPUES DE USARLO
# ---------------------------------------------------------

$usedTicket = Test-Status `
    -Name "Obtener Ticket despues de validarlo" `
    -Method "GET" `
    -Uri "$BaseUrl/tickets/$ticketId" `
    -ExpectedStatus 200

if ($null -ne $usedTicket) {

    Test-Value `
        -Name "Ticket persistido como USED" `
        -Actual $usedTicket.status `
        -Expected "USED"

    Test-NotNullValue `
        -Name "usedAt permanece persistido" `
        -Actual $usedTicket.usedAt
}

# ---------------------------------------------------------
# 26. INTENTAR USARLO NUEVAMENTE
# ---------------------------------------------------------

Test-Status `
    -Name "No permitir reutilizar Ticket USED" `
    -Method "POST" `
    -Uri "$BaseUrl/tickets/validate" `
    -ExpectedStatus 400 `
    -Body @{
        code = $ticketCode
    }

# ---------------------------------------------------------
# 27. CODE INEXISTENTE
# ---------------------------------------------------------

Test-Status `
    -Name "Validar Ticket con code inexistente" `
    -Method "POST" `
    -Uri "$BaseUrl/tickets/validate" `
    -ExpectedStatus 404 `
    -Body @{
        code = "00000000-0000-0000-0000-000000000000"
    }

# =========================================================
# VALIDACIONES DE CONSULTA
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 4 - VALIDACIONES"
Write-Host "========================================="

# ---------------------------------------------------------
# 28. TICKET INEXISTENTE
# ---------------------------------------------------------

Test-Status `
    -Name "Obtener Ticket inexistente" `
    -Method "GET" `
    -Uri "$BaseUrl/tickets/999999" `
    -ExpectedStatus 404

# ---------------------------------------------------------
# 29. ORDER INEXISTENTE
# ---------------------------------------------------------

Test-Status `
    -Name "Obtener Tickets de Order inexistente" `
    -Method "GET" `
    -Uri "$BaseUrl/orders/999999/tickets" `
    -ExpectedStatus 404

# ---------------------------------------------------------
# 30. USUARIO INEXISTENTE
# ---------------------------------------------------------

Test-Status `
    -Name "Obtener Tickets de usuario inexistente" `
    -Method "GET" `
    -Uri "$BaseUrl/users/999999/tickets" `
    -ExpectedStatus 404

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

