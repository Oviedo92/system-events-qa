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
                -TimeoutSec 15
        }
        else {
            $response = Invoke-WebRequest `
                -Uri $Uri `
                -Method $Method `
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

function Test-NullValue {
    param(
        [string]$Name,
        $Actual
    )

    Write-Host ""
    Write-Host "TEST: $Name"
    Write-Host "Valor recibido: $Actual"

    if ($null -eq $Actual) {
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
Write-Host "TEST DE PAYMENTS"
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
# CART -> RESERVATION -> ORDER -> PAYMENT -> APPROVED
# -> ORDER PAID -> TICKET ACTIVE
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 1 - PAYMENT APPROVED + TICKET"
Write-Host "========================================="

# ---------------------------------------------------------
# 1. CREAR CART
# ---------------------------------------------------------

$cart = Test-Status `
    -Name "Crear carrito para Payment" `
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
# 3. OBTENER CART
# ---------------------------------------------------------

$cartData = Test-Status `
    -Name "Obtener carrito con precios calculados" `
    -Method "GET" `
    -Uri "$BaseUrl/carts/$cartId" `
    -ExpectedStatus 200

if ($null -eq $cartData) {
    Write-Host "No se pudo obtener el Cart."
    exit
}

$expectedSubtotal = $cartData.subtotal
$expectedDiscount = $cartData.discount
$expectedTotal = $cartData.total

Write-Host "Subtotal: $expectedSubtotal"
Write-Host "Discount: $expectedDiscount"
Write-Host "Total: $expectedTotal"

# ---------------------------------------------------------
# 4. CREAR RESERVATION
# ---------------------------------------------------------

$reservation = Test-Status `
    -Name "Crear Reservation para Payment" `
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

Test-Value `
    -Name "Reservation inicia en PENDING" `
    -Actual $reservation.status `
    -Expected "PENDING"

# ---------------------------------------------------------
# 5. CREAR ORDER
# ---------------------------------------------------------

$order = Test-Status `
    -Name "Crear Order para Payment" `
    -Method "POST" `
    -Uri "$BaseUrl/orders" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
        reservationId = $reservationId
    }

if ($null -eq $order) {
    Write-Host "No se pudo crear la Order."
    exit
}

$orderId = $order.id

Write-Host "Order creada: $orderId"

Test-Value `
    -Name "Order inicia en PENDING" `
    -Actual $order.status `
    -Expected "PENDING"

Test-Value `
    -Name "Order pertenece al usuario correcto" `
    -Actual $order.userId `
    -Expected $userId

Test-Value `
    -Name "Order pertenece al evento correcto" `
    -Actual $order.eventId `
    -Expected $eventId

Test-Value `
    -Name "Order usa la Reservation correcta" `
    -Actual $order.reservationId `
    -Expected $reservationId

Test-Value `
    -Name "Order usa el Cart correcto" `
    -Actual $order.cartId `
    -Expected $cartId

Test-Value `
    -Name "Order conserva subtotal" `
    -Actual $order.subtotal `
    -Expected $expectedSubtotal

Test-Value `
    -Name "Order conserva discount" `
    -Actual $order.discount `
    -Expected $expectedDiscount

Test-Value `
    -Name "Order conserva total" `
    -Actual $order.total `
    -Expected $expectedTotal

# ---------------------------------------------------------
# 6. CREAR PAYMENT
# ---------------------------------------------------------

$payment = Test-Status `
    -Name "Crear Payment correctamente" `
    -Method "POST" `
    -Uri "$BaseUrl/payments" `
    -ExpectedStatus 201 `
    -Body @{
        orderId = $orderId
    }

if ($null -eq $payment) {
    Write-Host "No se pudo crear el Payment."
    exit
}

$paymentId = $payment.id

Write-Host "Payment creado: $paymentId"

# ---------------------------------------------------------
# 7. PAYMENT PENDING
# ---------------------------------------------------------

Test-Value `
    -Name "Payment inicia en PENDING" `
    -Actual $payment.status `
    -Expected "PENDING"

# ---------------------------------------------------------
# 8. AMOUNT
# ---------------------------------------------------------

Test-Value `
    -Name "Payment copia el total de la Order" `
    -Actual $payment.amount `
    -Expected $expectedTotal

# ---------------------------------------------------------
# 9. METHOD
# ---------------------------------------------------------

Test-Value `
    -Name "Payment usa metodo SIMULATED" `
    -Actual $payment.method `
    -Expected "SIMULATED"

# ---------------------------------------------------------
# 10. TRANSACTION ID INICIAL
# ---------------------------------------------------------

Test-NullValue `
    -Name "Payment inicia sin transactionId" `
    -Actual $payment.transactionId

# ---------------------------------------------------------
# 11. PAID AT INICIAL
# ---------------------------------------------------------

Test-NullValue `
    -Name "Payment inicia sin paidAt" `
    -Actual $payment.paidAt

# ---------------------------------------------------------
# 12. OBTENER PAYMENT
# ---------------------------------------------------------

$foundPayment = Test-Status `
    -Name "Obtener Payment por ID" `
    -Method "GET" `
    -Uri "$BaseUrl/payments/$paymentId" `
    -ExpectedStatus 200

# ---------------------------------------------------------
# 13. PENDING -> PENDING
# ---------------------------------------------------------

$pendingPayment = Test-Status `
    -Name "Mantener Payment en PENDING" `
    -Method "PATCH" `
    -Uri "$BaseUrl/payments/$paymentId" `
    -ExpectedStatus 200 `
    -Body @{
        status = "PENDING"
    }

if ($null -ne $pendingPayment) {

    Test-Value `
        -Name "Payment sigue en PENDING" `
        -Actual $pendingPayment.status `
        -Expected "PENDING"
}

# ---------------------------------------------------------
# 14. APROBAR PAYMENT
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
    Write-Host "No se pudo aprobar el Payment."
    exit
}

# ---------------------------------------------------------
# 15. PAYMENT APPROVED
# ---------------------------------------------------------

Test-Value `
    -Name "Payment cambia a APPROVED" `
    -Actual $approvedPayment.status `
    -Expected "APPROVED"

# ---------------------------------------------------------
# 16. TRANSACTION ID
# ---------------------------------------------------------

Test-NotNullValue `
    -Name "Payment genera transactionId" `
    -Actual $approvedPayment.transactionId

# ---------------------------------------------------------
# 17. PAID AT
# ---------------------------------------------------------

Test-NotNullValue `
    -Name "Payment genera paidAt" `
    -Actual $approvedPayment.paidAt

# ---------------------------------------------------------
# 18. OBTENER ORDER DESPUES DEL PAYMENT
# ---------------------------------------------------------

$updatedOrder = Test-Status `
    -Name "Obtener Order despues de aprobar Payment" `
    -Method "GET" `
    -Uri "$BaseUrl/orders/$orderId" `
    -ExpectedStatus 200

if ($null -ne $updatedOrder) {

    Test-Value `
        -Name "Order cambia a PAID despues del Payment" `
        -Actual $updatedOrder.status `
        -Expected "PAID"
}

# ---------------------------------------------------------
# 18.1. VERIFICAR RESERVATION CONFIRMED
# ---------------------------------------------------------

$reservationCheck = Test-Status `
    -Name "Obtener Reservation despues de aprobar Payment" `
    -Method "GET" `
    -Uri "$BaseUrl/reservations/$reservationId" `
    -ExpectedStatus 200

if ($null -ne $reservationCheck) {

    Test-Value `
        -Name "Reservation cambia a CONFIRMED despues del Payment" `
        -Actual $reservationCheck.status `
        -Expected "CONFIRMED"
}

# =========================================================
# TICKETS
# =========================================================

# ---------------------------------------------------------
# 19. OBTENER TICKETS DE LA ORDER
# ---------------------------------------------------------

$tickets = Test-Status `
    -Name "Obtener Tickets generados por la Order" `
    -Method "GET" `
    -Uri "$BaseUrl/orders/$orderId/tickets" `
    -ExpectedStatus 200

$ticketList = @($tickets)

Write-Host ""
Write-Host "Tickets encontrados: $($ticketList.Count)"

# ---------------------------------------------------------
# 20. EXISTE AL MENOS UN TICKET
# ---------------------------------------------------------

if ($ticketList.Count -gt 0) {

    Write-Host ""
    Write-Host "TEST: La Order genera al menos un Ticket"
    Write-Host "PASS"
    $passed++

}
else {

    Write-Host ""
    Write-Host "TEST: La Order genera al menos un Ticket"
    Write-Host "FAIL"
    $failed++
}

# ---------------------------------------------------------
# 21. VALIDAR PRIMER TICKET
# ---------------------------------------------------------

if ($ticketList.Count -gt 0) {

    $ticket = $ticketList[0]

    Test-Value `
        -Name "Ticket pertenece a la Order correcta" `
        -Actual $ticket.orderId `
        -Expected $orderId

    Test-Value `
        -Name "Ticket pertenece al usuario correcto" `
        -Actual $ticket.userId `
        -Expected $userId

    Test-Value `
        -Name "Ticket pertenece al evento correcto" `
        -Actual $ticket.eventId `
        -Expected $eventId

    Test-Value `
        -Name "Ticket usa el TicketType correcto" `
        -Actual $ticket.ticketTypeId `
        -Expected $ticketTypeId

    Test-Value `
        -Name "Ticket inicia en ACTIVE" `
        -Actual $ticket.status `
        -Expected "ACTIVE"

    Test-NotNullValue `
        -Name "Ticket tiene code generado" `
        -Actual $ticket.code

    Test-NotNullValue `
        -Name "Ticket tiene issuedAt" `
        -Actual $ticket.issuedAt

    Test-NullValue `
        -Name "Ticket inicia sin usedAt" `
        -Actual $ticket.usedAt
}

# ---------------------------------------------------------
# 22. OBTENER TICKET POR ID
# ---------------------------------------------------------

if ($ticketList.Count -gt 0) {

    $ticketId = $ticketList[0].id

    $foundTicket = Test-Status `
        -Name "Obtener Ticket por ID" `
        -Method "GET" `
        -Uri "$BaseUrl/tickets/$ticketId" `
        -ExpectedStatus 200

    if ($null -ne $foundTicket) {

        Test-Value `
            -Name "Ticket consultado mantiene status ACTIVE" `
            -Actual $foundTicket.status `
            -Expected "ACTIVE"
    }
}

# ---------------------------------------------------------
# 23. VERIFICAR PAYMENT PERSISTIDO
# ---------------------------------------------------------

$approvedPaymentCheck = Test-Status `
    -Name "Verificar Payment APPROVED despues de persistir" `
    -Method "GET" `
    -Uri "$BaseUrl/payments/$paymentId" `
    -ExpectedStatus 200

if ($null -ne $approvedPaymentCheck) {

    Test-Value `
        -Name "Payment persistido como APPROVED" `
        -Actual $approvedPaymentCheck.status `
        -Expected "APPROVED"

    Test-NotNullValue `
        -Name "transactionId permanece persistido" `
        -Actual $approvedPaymentCheck.transactionId

    Test-NotNullValue `
        -Name "paidAt permanece persistido" `
        -Actual $approvedPaymentCheck.paidAt
}

# ---------------------------------------------------------
# 24. PAYMENT APPROVED INMUTABLE
# ---------------------------------------------------------

Test-Status `
    -Name "Modificar Payment ya APPROVED" `
    -Method "PATCH" `
    -Uri "$BaseUrl/payments/$paymentId" `
    -ExpectedStatus 400 `
    -Body @{
        status = "REJECTED"
    }

# ---------------------------------------------------------
# 25. PAYMENT APPROVED NO ELIMINABLE
# ---------------------------------------------------------

Test-Status `
    -Name "Eliminar Payment APPROVED" `
    -Method "DELETE" `
    -Uri "$BaseUrl/payments/$paymentId" `
    -ExpectedStatus 400

# ---------------------------------------------------------
# 26. PAYMENT DUPLICADO
# ---------------------------------------------------------

Test-Status `
    -Name "Crear Payment duplicado para la misma Order" `
    -Method "POST" `
    -Uri "$BaseUrl/payments" `
    -ExpectedStatus 400 `
    -Body @{
        orderId = $orderId
    }

# =========================================================
# VALIDACIONES
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 2 - VALIDACIONES"
Write-Host "========================================="

# ---------------------------------------------------------
# 27. ORDER INEXISTENTE
# ---------------------------------------------------------

Test-Status `
    -Name "Crear Payment con Order inexistente" `
    -Method "POST" `
    -Uri "$BaseUrl/payments" `
    -ExpectedStatus 404 `
    -Body @{
        orderId = 999999
    }

# ---------------------------------------------------------
# 28. ORDER ID 0
# ---------------------------------------------------------

Test-Status `
    -Name "Crear Payment con orderId 0" `
    -Method "POST" `
    -Uri "$BaseUrl/payments" `
    -ExpectedStatus 400 `
    -Body @{
        orderId = 0
    }

# ---------------------------------------------------------
# 29. PAYMENT INEXISTENTE
# ---------------------------------------------------------

Test-Status `
    -Name "Obtener Payment inexistente" `
    -Method "GET" `
    -Uri "$BaseUrl/payments/999999" `
    -ExpectedStatus 404

# ---------------------------------------------------------
# 30. UPDATE INEXISTENTE
# ---------------------------------------------------------

Test-Status `
    -Name "Actualizar Payment inexistente" `
    -Method "PATCH" `
    -Uri "$BaseUrl/payments/999999" `
    -ExpectedStatus 404 `
    -Body @{
        status = "APPROVED"
    }

# ---------------------------------------------------------
# 31. DELETE INEXISTENTE
# ---------------------------------------------------------

Test-Status `
    -Name "Eliminar Payment inexistente" `
    -Method "DELETE" `
    -Uri "$BaseUrl/payments/999999" `
    -ExpectedStatus 404

# ---------------------------------------------------------
# 32. STATUS INVALIDO
# ---------------------------------------------------------

Test-Status `
    -Name "Actualizar Payment con status invalido" `
    -Method "PATCH" `
    -Uri "$BaseUrl/payments/$paymentId" `
    -ExpectedStatus 400 `
    -Body @{
        status = "CUALQUIERA"
    }

# =========================================================
# FLUJO 3 - PAYMENT REJECTED
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 3 - PAYMENT REJECTED"
Write-Host "========================================="

# ---------------------------------------------------------
# 33. SEGUNDO CART
# ---------------------------------------------------------

$secondCart = Test-Status `
    -Name "Crear segundo carrito" `
    -Method "POST" `
    -Uri "$BaseUrl/users/$userId/cart" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
    }

if ($null -eq $secondCart) {
    exit
}

$secondCartId = $secondCart.id

# ---------------------------------------------------------
# 34. SEGUNDO CART ITEM
# ---------------------------------------------------------

$secondCartItem = Test-Status `
    -Name "Agregar Ticket al segundo carrito" `
    -Method "POST" `
    -Uri "$BaseUrl/carts/$secondCartId/items" `
    -ExpectedStatus 201 `
    -Body @{
        ticketTypeId = $ticketTypeId
        quantity = 1
    }

if ($null -eq $secondCartItem) {
    exit
}

# ---------------------------------------------------------
# 35. SEGUNDA RESERVATION
# ---------------------------------------------------------

$secondReservation = Test-Status `
    -Name "Crear segunda Reservation" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
        cartId = $secondCartId
    }

if ($null -eq $secondReservation) {
    exit
}

$secondReservationId = $secondReservation.id

# ---------------------------------------------------------
# 36. SEGUNDA ORDER
# ---------------------------------------------------------

$secondOrder = Test-Status `
    -Name "Crear segunda Order" `
    -Method "POST" `
    -Uri "$BaseUrl/orders" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
        reservationId = $secondReservationId
    }

if ($null -eq $secondOrder) {
    exit
}

$secondOrderId = $secondOrder.id

# ---------------------------------------------------------
# 37. SEGUNDO PAYMENT
# ---------------------------------------------------------

$secondPayment = Test-Status `
    -Name "Crear segundo Payment" `
    -Method "POST" `
    -Uri "$BaseUrl/payments" `
    -ExpectedStatus 201 `
    -Body @{
        orderId = $secondOrderId
    }

if ($null -eq $secondPayment) {
    exit
}

$secondPaymentId = $secondPayment.id

# ---------------------------------------------------------
# 38. REJECTED
# ---------------------------------------------------------

$rejectedPayment = Test-Status `
    -Name "Rechazar Payment" `
    -Method "PATCH" `
    -Uri "$BaseUrl/payments/$secondPaymentId" `
    -ExpectedStatus 200 `
    -Body @{
        status = "REJECTED"
    }

if ($null -ne $rejectedPayment) {

    Test-Value `
        -Name "Payment cambia a REJECTED" `
        -Actual $rejectedPayment.status `
        -Expected "REJECTED"
}

# ---------------------------------------------------------
# 39. ORDER PENDING
# ---------------------------------------------------------

$secondOrderAfterReject = Test-Status `
    -Name "Obtener segunda Order despues de rechazo" `
    -Method "GET" `
    -Uri "$BaseUrl/orders/$secondOrderId" `
    -ExpectedStatus 200

if ($null -ne $secondOrderAfterReject) {

    Test-Value `
        -Name "Order sigue PENDING despues de Payment rechazado" `
        -Actual $secondOrderAfterReject.status `
        -Expected "PENDING"
}

# ---------------------------------------------------------
# 40. REJECTED INMUTABLE
# ---------------------------------------------------------

Test-Status `
    -Name "Modificar Payment ya REJECTED" `
    -Method "PATCH" `
    -Uri "$BaseUrl/payments/$secondPaymentId" `
    -ExpectedStatus 400 `
    -Body @{
        status = "APPROVED"
    }

# ---------------------------------------------------------
# 41. ELIMINAR REJECTED
# ---------------------------------------------------------

Test-Status `
    -Name "Eliminar Payment REJECTED" `
    -Method "DELETE" `
    -Uri "$BaseUrl/payments/$secondPaymentId" `
    -ExpectedStatus 200

# ---------------------------------------------------------
# 42. ELIMINAR REJECTED NUEVAMENTE
# ---------------------------------------------------------

Test-Status `
    -Name "Eliminar Payment rechazado inexistente" `
    -Method "DELETE" `
    -Uri "$BaseUrl/payments/$secondPaymentId" `
    -ExpectedStatus 404

# ---------------------------------------------------------
# 43. ELIMINAR SEGUNDA ORDER
# ---------------------------------------------------------

Test-Status `
    -Name "Eliminar segunda Order" `
    -Method "DELETE" `
    -Uri "$BaseUrl/orders/$secondOrderId" `
    -ExpectedStatus 200

# ---------------------------------------------------------
# 44. ELIMINAR SEGUNDA RESERVATION
# ---------------------------------------------------------

Test-Status `
    -Name "Eliminar segunda Reservation" `
    -Method "DELETE" `
    -Uri "$BaseUrl/reservations/$secondReservationId" `
    -ExpectedStatus 200

# =========================================================
# FLUJO 4 - RESERVATION CANCELADA ANTES DE PAYMENT
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 4 - RESERVATION CANCELADA"
Write-Host "========================================="

# ---------------------------------------------------------
# 45. TERCER CART
# ---------------------------------------------------------

$thirdCart = Test-Status `
    -Name "Crear tercer carrito" `
    -Method "POST" `
    -Uri "$BaseUrl/users/$userId/cart" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
    }

if ($null -eq $thirdCart) {
    exit
}

$thirdCartId = $thirdCart.id

# ---------------------------------------------------------
# 46. TERCER CART ITEM
# ---------------------------------------------------------

Test-Status `
    -Name "Agregar Ticket al tercer carrito" `
    -Method "POST" `
    -Uri "$BaseUrl/carts/$thirdCartId/items" `
    -ExpectedStatus 201 `
    -Body @{
        ticketTypeId = $ticketTypeId
        quantity = 1
    }

# ---------------------------------------------------------
# 47. TERCERA RESERVATION
# ---------------------------------------------------------

$thirdReservation = Test-Status `
    -Name "Crear tercera Reservation" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
        cartId = $thirdCartId
    }

if ($null -eq $thirdReservation) {
    exit
}

$thirdReservationId = $thirdReservation.id

# ---------------------------------------------------------
# 48. TERCERA ORDER
# ---------------------------------------------------------

$thirdOrder = Test-Status `
    -Name "Crear tercera Order" `
    -Method "POST" `
    -Uri "$BaseUrl/orders" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
        reservationId = $thirdReservationId
    }

if ($null -eq $thirdOrder) {
    exit
}

$thirdOrderId = $thirdOrder.id

# ---------------------------------------------------------
# 49. CANCELAR RESERVATION
# ---------------------------------------------------------

Test-Status `
    -Name "Cancelar tercera Reservation" `
    -Method "PATCH" `
    -Uri "$BaseUrl/reservations/$thirdReservationId" `
    -ExpectedStatus 200 `
    -Body @{
        status = "CANCELLED"
    }

# ---------------------------------------------------------
# 50. CREAR PAYMENT CON RESERVATION CANCELLED
# ---------------------------------------------------------

Test-Status `
    -Name "Crear Payment con Reservation CANCELLED" `
    -Method "POST" `
    -Uri "$BaseUrl/payments" `
    -ExpectedStatus 400 `
    -Body @{
        orderId = $thirdOrderId
    }

# ---------------------------------------------------------
# 51. ELIMINAR TERCERA ORDER
# ---------------------------------------------------------

Test-Status `
    -Name "Eliminar tercera Order" `
    -Method "DELETE" `
    -Uri "$BaseUrl/orders/$thirdOrderId" `
    -ExpectedStatus 200

# ---------------------------------------------------------
# 52. ELIMINAR TERCERA RESERVATION
# ---------------------------------------------------------

Test-Status `
    -Name "Eliminar tercera Reservation" `
    -Method "DELETE" `
    -Uri "$BaseUrl/reservations/$thirdReservationId" `
    -ExpectedStatus 200

# =========================================================
# FLUJO 5 - PAYMENT PENDING + RESERVATION CANCELADA
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 5 - VALIDACION AL APROBAR"
Write-Host "========================================="

# ---------------------------------------------------------
# 53. CUARTO CART
# ---------------------------------------------------------

$fourthCart = Test-Status `
    -Name "Crear cuarto carrito" `
    -Method "POST" `
    -Uri "$BaseUrl/users/$userId/cart" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
    }

if ($null -eq $fourthCart) {
    exit
}

$fourthCartId = $fourthCart.id

# ---------------------------------------------------------
# 54. CUARTO CART ITEM
# ---------------------------------------------------------

Test-Status `
    -Name "Agregar Ticket al cuarto carrito" `
    -Method "POST" `
    -Uri "$BaseUrl/carts/$fourthCartId/items" `
    -ExpectedStatus 201 `
    -Body @{
        ticketTypeId = $ticketTypeId
        quantity = 1
    }

# ---------------------------------------------------------
# 55. CUARTA RESERVATION
# ---------------------------------------------------------

$fourthReservation = Test-Status `
    -Name "Crear cuarta Reservation" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
        cartId = $fourthCartId
    }

if ($null -eq $fourthReservation) {
    exit
}

$fourthReservationId = $fourthReservation.id

# ---------------------------------------------------------
# 56. CUARTA ORDER
# ---------------------------------------------------------

$fourthOrder = Test-Status `
    -Name "Crear cuarta Order" `
    -Method "POST" `
    -Uri "$BaseUrl/orders" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
        reservationId = $fourthReservationId
    }

if ($null -eq $fourthOrder) {
    exit
}

$fourthOrderId = $fourthOrder.id

# ---------------------------------------------------------
# 57. CUARTO PAYMENT
# ---------------------------------------------------------

$fourthPayment = Test-Status `
    -Name "Crear cuarto Payment" `
    -Method "POST" `
    -Uri "$BaseUrl/payments" `
    -ExpectedStatus 201 `
    -Body @{
        orderId = $fourthOrderId
    }

if ($null -eq $fourthPayment) {
    exit
}

$fourthPaymentId = $fourthPayment.id

# ---------------------------------------------------------
# 58. CANCELAR RESERVATION
# ---------------------------------------------------------

Test-Status `
    -Name "Cancelar Reservation con Payment PENDING" `
    -Method "PATCH" `
    -Uri "$BaseUrl/reservations/$fourthReservationId" `
    -ExpectedStatus 200 `
    -Body @{
        status = "CANCELLED"
    }

# ---------------------------------------------------------
# 59. INTENTAR APROBAR
# ---------------------------------------------------------

Test-Status `
    -Name "No aprobar Payment con Reservation CANCELLED" `
    -Method "PATCH" `
    -Uri "$BaseUrl/payments/$fourthPaymentId" `
    -ExpectedStatus 400 `
    -Body @{
        status = "APPROVED"
    }

# ---------------------------------------------------------
# 60. PAYMENT SIGUE PENDING
# ---------------------------------------------------------

$fourthPaymentAfterReject = Test-Status `
    -Name "Verificar Payment sigue PENDING despues de rechazo de aprobacion" `
    -Method "GET" `
    -Uri "$BaseUrl/payments/$fourthPaymentId" `
    -ExpectedStatus 200

if ($null -ne $fourthPaymentAfterReject) {

    Test-Value `
        -Name "Payment permanece PENDING" `
        -Actual $fourthPaymentAfterReject.status `
        -Expected "PENDING"
}

# ---------------------------------------------------------
# 61. ELIMINAR PAYMENT PENDING
# ---------------------------------------------------------

Test-Status `
    -Name "Eliminar cuarto Payment PENDING" `
    -Method "DELETE" `
    -Uri "$BaseUrl/payments/$fourthPaymentId" `
    -ExpectedStatus 200

# ---------------------------------------------------------
# 62. ELIMINAR CUARTA ORDER
# ---------------------------------------------------------

Test-Status `
    -Name "Eliminar cuarta Order" `
    -Method "DELETE" `
    -Uri "$BaseUrl/orders/$fourthOrderId" `
    -ExpectedStatus 200

# ---------------------------------------------------------
# 63. ELIMINAR CUARTA RESERVATION
# ---------------------------------------------------------

Test-Status `
    -Name "Eliminar cuarta Reservation" `
    -Method "DELETE" `
    -Uri "$BaseUrl/reservations/$fourthReservationId" `
    -ExpectedStatus 200

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
