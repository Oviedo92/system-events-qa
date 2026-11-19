$BaseUrl = "http://localhost:3000"

$passed = 0
$failed = 0

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
                -Body ($Body | ConvertTo-Json -Depth 10)
        }
        else {
            $response = Invoke-WebRequest `
                -Uri $Uri `
                -Method $Method
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

Write-Host "========================================="
Write-Host "TEST DE ORDERS"
Write-Host "========================================="

# --------------------------------------------------
# DATOS BASE
# --------------------------------------------------

$userId = 1
$eventId = 5
$ticketTypeId = 3
$seatId = 12

# --------------------------------------------------
# 1. CREAR CART
# --------------------------------------------------

$cartBody = @{
    userId = $userId
    eventId = $eventId
}

$cart = Test-Status `
    -Name "Crear carrito para Order" `
    -Method "POST" `
    -Uri "$BaseUrl/users/$userId/cart" `
    -ExpectedStatus 201 `
    -Body $cartBody

if ($null -eq $cart) {
    Write-Host ""
    Write-Host "No se pudo crear el carrito."
    exit
}

$cartId = $cart.id

Write-Host "Cart creado: $cartId"

# --------------------------------------------------
# 2. AGREGAR TICKET AL CART
# --------------------------------------------------

$cartItemBody = @{
    ticketTypeId = $ticketTypeId
    quantity = 1
}

$cartItem = Test-Status `
    -Name "Agregar TicketType al carrito" `
    -Method "POST" `
    -Uri "$BaseUrl/carts/$cartId/items" `
    -ExpectedStatus 201 `
    -Body $cartItemBody

if ($null -eq $cartItem) {
    Write-Host ""
    Write-Host "No se pudo agregar el TicketType."
    exit
}

# --------------------------------------------------
# 3. OBTENER CART CON SUS TOTALES
# --------------------------------------------------

$cartData = Test-Status `
    -Name "Obtener carrito con precios calculados" `
    -Method "GET" `
    -Uri "$BaseUrl/carts/$cartId" `
    -ExpectedStatus 200

if ($null -eq $cartData) {
    Write-Host ""
    Write-Host "No se pudo obtener el carrito."
    exit
}

$expectedSubtotal = $cartData.subtotal
$expectedDiscount = $cartData.discount
$expectedTotal = $cartData.total

Write-Host "Subtotal del Cart: $expectedSubtotal"
Write-Host "Descuento del Cart: $expectedDiscount"
Write-Host "Total del Cart: $expectedTotal"

# --------------------------------------------------
# 4. CREAR RESERVATION
# --------------------------------------------------

$reservationBody = @{
    userId = $userId
    eventId = $eventId
    cartId = $cartId
}

$reservation = Test-Status `
    -Name "Crear Reservation para la Order" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations" `
    -ExpectedStatus 201 `
    -Body $reservationBody

if ($null -eq $reservation) {
    Write-Host ""
    Write-Host "No se pudo crear la Reservation."
    exit
}

$reservationId = $reservation.id

# --------------------------------------------------
# 5. CREAR RESERVATION ITEM CON SEAT
# --------------------------------------------------

$reservationItem = Test-Status `
    -Name "Crear ReservationItem con Seat" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations/$reservationId/items" `
    -ExpectedStatus 201 `
    -Body @{
        ticketTypeId = $ticketTypeId
        quantity = 1
        seatId = $seatId
    }

if ($null -eq $reservationItem) {
    Write-Host ""
    Write-Host "No se pudo crear ReservationItem."
    exit
}

Write-Host "Reservation creada: $reservationId"

# --------------------------------------------------
# 6. VALIDAR RESERVATION PENDING
# --------------------------------------------------

Test-Value `
    -Name "Reservation inicia en PENDING" `
    -Actual $reservation.status `
    -Expected "PENDING"

# --------------------------------------------------
# 7. CREAR ORDER
# --------------------------------------------------

$orderBody = @{
    userId = $userId
    eventId = $eventId
    reservationId = $reservationId
}

$order = Test-Status `
    -Name "Crear Order correctamente" `
    -Method "POST" `
    -Uri "$BaseUrl/orders" `
    -ExpectedStatus 201 `
    -Body $orderBody

if ($null -eq $order) {
    Write-Host ""
    Write-Host "No se pudo crear la Order."
    exit
}

$orderId = $order.id

Write-Host "Order creada: $orderId"

# --------------------------------------------------
# 8. VALIDAR STATUS ORDER
# --------------------------------------------------

Test-Value `
    -Name "Order inicia en PENDING" `
    -Actual $order.status `
    -Expected "PENDING"

# --------------------------------------------------
# 9. VALIDAR RELACIONES
# --------------------------------------------------

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

# --------------------------------------------------
# 10. VALIDAR SNAPSHOT DE PRECIOS
# --------------------------------------------------

Test-Value `
    -Name "Order conserva subtotal del Cart" `
    -Actual $order.subtotal `
    -Expected $expectedSubtotal

Test-Value `
    -Name "Order conserva discount del Cart" `
    -Actual $order.discount `
    -Expected $expectedDiscount

Test-Value `
    -Name "Order conserva total del Cart" `
    -Actual $order.total `
    -Expected $expectedTotal

# --------------------------------------------------
# 11. VALIDAR ORDER ITEMS
# --------------------------------------------------

if ($null -ne $order.items -and $order.items.Count -eq 1) {
    Write-Host ""
    Write-Host "TEST: Order contiene un OrderItem"
    Write-Host "PASS"
    $passed++
}
else {
    Write-Host ""
    Write-Host "TEST: Order contiene un OrderItem"
    Write-Host "FAIL"
    $failed++
}

if ($null -ne $order.items -and $order.items.Count -gt 0) {

    $orderItem = $order.items[0]

    Test-Value `
        -Name "OrderItem conserva quantity" `
        -Actual $orderItem.quantity `
        -Expected 1

    Test-Value `
        -Name "OrderItem conserva TicketType" `
        -Actual $orderItem.ticketTypeId `
        -Expected $ticketTypeId

    Test-Value `
        -Name "OrderItem conserva Seat" `
        -Actual $orderItem.seatId `
        -Expected $seatId
}

# --------------------------------------------------
# 12. OBTENER ORDER
# --------------------------------------------------

$foundOrder = Test-Status `
    -Name "Obtener Order por ID" `
    -Method "GET" `
    -Uri "$BaseUrl/orders/$orderId" `
    -ExpectedStatus 200

# --------------------------------------------------
# 13. LISTAR ORDERS DEL USUARIO
# --------------------------------------------------

$userOrders = Test-Status `
    -Name "Listar Orders del usuario" `
    -Method "GET" `
    -Uri "$BaseUrl/users/$userId/orders" `
    -ExpectedStatus 200

# --------------------------------------------------
# 14. IMPEDIR PAID DIRECTO
# --------------------------------------------------

$directPaidBody = @{
    status = "PAID"
}

Test-Status `
    -Name "No permitir cambiar Order directamente a PAID" `
    -Method "PATCH" `
    -Uri "$BaseUrl/orders/$orderId" `
    -ExpectedStatus 400 `
    -Body $directPaidBody

# --------------------------------------------------
# 15. VERIFICAR QUE ORDER SIGUE PENDING
# --------------------------------------------------

$orderAfterRejectedPaid = Test-Status `
    -Name "Order permanece PENDING despues de rechazar PAID directo" `
    -Method "GET" `
    -Uri "$BaseUrl/orders/$orderId" `
    -ExpectedStatus 200

if ($null -ne $orderAfterRejectedPaid) {

    Test-Value `
        -Name "Order permanece en PENDING" `
        -Actual $orderAfterRejectedPaid.status `
        -Expected "PENDING"
}

# --------------------------------------------------
# 16. USUARIO INEXISTENTE
# --------------------------------------------------

$invalidUserOrderBody = @{
    userId = 999999
    eventId = $eventId
    reservationId = $reservationId
}

Test-Status `
    -Name "Crear Order con usuario inexistente" `
    -Method "POST" `
    -Uri "$BaseUrl/orders" `
    -ExpectedStatus 404 `
    -Body $invalidUserOrderBody

# --------------------------------------------------
# 17. EVENTO INEXISTENTE
# --------------------------------------------------

$invalidEventOrderBody = @{
    userId = $userId
    eventId = 999999
    reservationId = $reservationId
}

Test-Status `
    -Name "Crear Order con evento inexistente" `
    -Method "POST" `
    -Uri "$BaseUrl/orders" `
    -ExpectedStatus 404 `
    -Body $invalidEventOrderBody

# --------------------------------------------------
# 18. RESERVATION INEXISTENTE
# --------------------------------------------------

$invalidReservationOrderBody = @{
    userId = $userId
    eventId = $eventId
    reservationId = 999999
}

Test-Status `
    -Name "Crear Order con Reservation inexistente" `
    -Method "POST" `
    -Uri "$BaseUrl/orders" `
    -ExpectedStatus 404 `
    -Body $invalidReservationOrderBody

# --------------------------------------------------
# 19. RESERVATION DE OTRO USUARIO
# --------------------------------------------------

$wrongUserOrderBody = @{
    userId = 2
    eventId = $eventId
    reservationId = $reservationId
}

Test-Status `
    -Name "Crear Order con Reservation de otro usuario" `
    -Method "POST" `
    -Uri "$BaseUrl/orders" `
    -ExpectedStatus 400 `
    -Body $wrongUserOrderBody

# --------------------------------------------------
# 20. ORDER DUPLICADA
# --------------------------------------------------

$duplicateOrderBody = @{
    userId = $userId
    eventId = $eventId
    reservationId = $reservationId
}

Test-Status `
    -Name "Crear Order duplicada para la misma Reservation" `
    -Method "POST" `
    -Uri "$BaseUrl/orders" `
    -ExpectedStatus 400 `
    -Body $duplicateOrderBody

# --------------------------------------------------
# 21. RESERVATION CANCELADA
# --------------------------------------------------

$secondCartBody = @{
    userId = $userId
    eventId = $eventId
}

$secondCart = Test-Status `
    -Name "Crear segundo carrito para validar Reservation cancelada" `
    -Method "POST" `
    -Uri "$BaseUrl/users/$userId/cart" `
    -ExpectedStatus 201 `
    -Body $secondCartBody

if ($null -ne $secondCart) {

    $secondCartId = $secondCart.id

    $secondCartItemBody = @{
        ticketTypeId = $ticketTypeId
        quantity = 1
    }

    Test-Status `
        -Name "Agregar TicketType al segundo carrito" `
        -Method "POST" `
        -Uri "$BaseUrl/carts/$secondCartId/items" `
        -ExpectedStatus 201 `
        -Body $secondCartItemBody

    $secondReservationBody = @{
        userId = $userId
        eventId = $eventId
        cartId = $secondCartId
    }

    $secondReservation = Test-Status `
        -Name "Crear segunda Reservation" `
        -Method "POST" `
        -Uri "$BaseUrl/reservations" `
        -ExpectedStatus 201 `
        -Body $secondReservationBody

    if ($null -ne $secondReservation) {

        $secondReservationId = $secondReservation.id

        Test-Status `
            -Name "Cancelar segunda Reservation" `
            -Method "PATCH" `
            -Uri "$BaseUrl/reservations/$secondReservationId" `
            -ExpectedStatus 200 `
            -Body @{
                status = "CANCELLED"
            }

        $cancelledOrderBody = @{
            userId = $userId
            eventId = $eventId
            reservationId = $secondReservationId
        }

        Test-Status `
            -Name "Crear Order con Reservation CANCELLED" `
            -Method "POST" `
            -Uri "$BaseUrl/orders" `
            -ExpectedStatus 400 `
            -Body $cancelledOrderBody
    }
}

# --------------------------------------------------
# 22. ORDER INEXISTENTE
# --------------------------------------------------

Test-Status `
    -Name "Obtener Order inexistente" `
    -Method "GET" `
    -Uri "$BaseUrl/orders/999999" `
    -ExpectedStatus 404

# --------------------------------------------------
# 23. ACTUALIZAR ORDER INEXISTENTE
# --------------------------------------------------

Test-Status `
    -Name "Actualizar Order inexistente" `
    -Method "PATCH" `
    -Uri "$BaseUrl/orders/999999" `
    -ExpectedStatus 404 `
    -Body @{
        status = "CANCELLED"
    }

# --------------------------------------------------
# 24. ELIMINAR ORDER
# --------------------------------------------------

Test-Status `
    -Name "Eliminar Order" `
    -Method "DELETE" `
    -Uri "$BaseUrl/orders/$orderId" `
    -ExpectedStatus 200

# --------------------------------------------------
# 25. ELIMINAR RESERVATION Y LIBERAR SEAT
# --------------------------------------------------

Test-Status `
    -Name "Eliminar Reservation de prueba y liberar Seat" `
    -Method "DELETE" `
    -Uri "$BaseUrl/reservations/$reservationId" `
    -ExpectedStatus 200

# --------------------------------------------------
# 26. ELIMINAR ORDER INEXISTENTE
# --------------------------------------------------

Test-Status `
    -Name "Eliminar Order inexistente" `
    -Method "DELETE" `
    -Uri "$BaseUrl/orders/$orderId" `
    -ExpectedStatus 404

# --------------------------------------------------
# RESULTADO FINAL
# --------------------------------------------------

Write-Host ""
Write-Host "========================================="
Write-Host "RESULTADO FINAL"
Write-Host "========================================="
Write-Host "PASS: $passed"
Write-Host "FAIL: $failed"

if ($failed -eq 0) {
    Write-Host "TODOS LOS TESTS PASARON"
}
else {
    Write-Host "HAY TESTS FALLIDOS"
}

