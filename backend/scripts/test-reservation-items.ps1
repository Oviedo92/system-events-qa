
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

function Get-Json {
    param(
        [string]$Uri
    )

    try {
        $response = Invoke-WebRequest `
            -Uri $Uri `
            -Method GET

        if (-not $response.Content) {
            return $null
        }

        $json = $response.Content | ConvertFrom-Json

        if ($json -is [System.Array]) {
            $items = @()

            foreach ($item in $json) {
                if ($item -is [System.Array]) {
                    foreach ($nestedItem in $item) {
                        $items += $nestedItem
                    }
                }
                else {
                    $items += $item
                }
            }

            return $items
        }

        return $json
    }
    catch {
        Write-Host ""
        Write-Host "ERROR GET: $Uri"
        Write-Host $_.Exception.Message
        return $null
    }
}

Write-Host "========================================="
Write-Host "TEST DE RESERVATION ITEMS"
Write-Host "========================================="

# =========================================================
# DATOS BASE
# =========================================================

$userId = 1
$eventId = 5

# =========================================================
# OBTENER SEATS
# =========================================================

$seats = @(Get-Json "$BaseUrl/events/$eventId/seats")

if ($null -eq $seats -or $seats.Count -eq 0) {
    Write-Host ""
    Write-Host "No hay Seats para realizar las pruebas."
    exit
}

$availableSeat = $seats |
    Where-Object { $_.status -eq "AVAILABLE" } |
    Select-Object -First 1

if ($null -eq $availableSeat) {
    Write-Host ""
    Write-Host "No existe ningun Seat AVAILABLE."
    exit
}

$seatId = $availableSeat.id
$seatZoneId = $availableSeat.zoneId

Write-Host ""
Write-Host "Seat seleccionado: $seatId"
Write-Host "Zone del Seat: $seatZoneId"

# =========================================================
# OBTENER TICKET TYPES
# =========================================================

$ticketTypes = @(Get-Json "$BaseUrl/events/$eventId/ticket-types")

if ($null -eq $ticketTypes -or $ticketTypes.Count -eq 0) {
    Write-Host ""
    Write-Host "No hay TicketTypes para realizar las pruebas."
    exit
}

# ---------------------------------------------------------
# TicketType general para pruebas de stock
# ---------------------------------------------------------

$stockTicketType = $null

foreach ($ticketType in $ticketTypes) {
    if ($null -ne $ticketType.available) {
        if ([int]$ticketType.available -ge 3) {
            $stockTicketType = $ticketType
            break
        }
    }
}

if ($null -eq $stockTicketType) {
    Write-Host ""
    Write-Host "No hay un TicketType con al menos 3 unidades disponibles."
    exit
}

$ticketTypeId = $stockTicketType.id
$initialAvailable = [int]$stockTicketType.available

Write-Host ""
Write-Host "TicketType stock: $ticketTypeId"
Write-Host "Available inicial: $initialAvailable"

# ---------------------------------------------------------
# TicketType compatible con la Zone del Seat
# ---------------------------------------------------------

$seatTicketType = $ticketTypes |
    Where-Object {
        $_.zoneId -eq $seatZoneId -and
        $_.available -ge 1
    } |
    Select-Object -First 1

if ($null -eq $seatTicketType) {
    Write-Host ""
    Write-Host "No existe TicketType compatible con la Zone del Seat."
    exit
}

$seatTicketTypeId = $seatTicketType.id
$seatInitialAvailable = [int]$seatTicketType.available

Write-Host ""
Write-Host "TicketType compatible con Seat: $seatTicketTypeId"
Write-Host "Available inicial Seat TicketType: $seatInitialAvailable"

# =========================================================
# FLUJO 1 - STOCK
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 1 - STOCK"
Write-Host "========================================="

# ---------------------------------------------------------
# 1. Crear Cart
# ---------------------------------------------------------

$cart1 = Test-Status `
    -Name "Crear Cart para ReservationItem" `
    -Method "POST" `
    -Uri "$BaseUrl/users/$userId/cart" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
    }

if ($null -eq $cart1) {
    exit
}

$cart1Id = $cart1.id

# ---------------------------------------------------------
# 2. Agregar Ticket al Cart
# ---------------------------------------------------------

Test-Status `
    -Name "Agregar TicketType al Cart" `
    -Method "POST" `
    -Uri "$BaseUrl/carts/$cart1Id/items" `
    -ExpectedStatus 201 `
    -Body @{
        ticketTypeId = $ticketTypeId
        quantity = 1
    }

# ---------------------------------------------------------
# 3. Crear Reservation
# ---------------------------------------------------------

$reservation1 = Test-Status `
    -Name "Crear Reservation" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
        cartId = $cart1Id
    }

if ($null -eq $reservation1) {
    exit
}

$reservation1Id = $reservation1.id

# ---------------------------------------------------------
# 4. Validar expiresAt
# ---------------------------------------------------------

$nowUtc = [DateTime]::UtcNow
$expiresAt = [DateTime]::Parse($reservation1.expiresAt).ToUniversalTime()
$minutesRemaining = ($expiresAt - $nowUtc).TotalMinutes

Write-Host ""
Write-Host "TEST: expiresAt se genera aproximadamente a 15 minutos"
Write-Host "Minutos restantes: $([math]::Round($minutesRemaining, 2))"

if ($minutesRemaining -ge 14 -and $minutesRemaining -le 16) {
    Write-Host "PASS"
    $passed++
}
else {
    Write-Host "FAIL"
    $failed++
}

# ---------------------------------------------------------
# 5. Crear ReservationItem quantity 1
# ---------------------------------------------------------

$reservationItem1 = Test-Status `
    -Name "Crear ReservationItem correctamente" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations/$reservation1Id/items" `
    -ExpectedStatus 201 `
    -Body @{
        ticketTypeId = $ticketTypeId
        quantity = 1
    }

if ($null -eq $reservationItem1) {
    exit
}

$reservationItem1Id = $reservationItem1.id

# ---------------------------------------------------------
# 6. Verificar decremento stock
# ---------------------------------------------------------

$currentTicketTypes = @(Get-Json "$BaseUrl/events/$eventId/ticket-types")

$currentTicket = $currentTicketTypes |
    Where-Object { $_.id -eq $ticketTypeId } |
    Select-Object -First 1

Test-Value `
    -Name "TicketType.available disminuye en 1" `
    -Actual $currentTicket.available `
    -Expected ($initialAvailable - 1)

# ---------------------------------------------------------
# 7. Quantity 0
# ---------------------------------------------------------

Test-Status `
    -Name "Crear ReservationItem con quantity 0" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations/$reservation1Id/items" `
    -ExpectedStatus 400 `
    -Body @{
        ticketTypeId = $ticketTypeId
        quantity = 0
    }

# ---------------------------------------------------------
# 8. Stock insuficiente
# ---------------------------------------------------------

Test-Status `
    -Name "Crear ReservationItem superando el stock disponible" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations/$reservation1Id/items" `
    -ExpectedStatus 400 `
    -Body @{
        ticketTypeId = $ticketTypeId
        quantity = $initialAvailable
    }

# ---------------------------------------------------------
# 9. Actualizar quantity 1 -> 2
# ---------------------------------------------------------

Test-Status `
    -Name "Actualizar ReservationItem quantity 1 a 2" `
    -Method "PATCH" `
    -Uri "$BaseUrl/reservation-items/$reservationItem1Id" `
    -ExpectedStatus 200 `
    -Body @{
        quantity = 2
    }

# ---------------------------------------------------------
# 10. Verificar stock quantity 2
# ---------------------------------------------------------

$currentTicketTypes = @(Get-Json "$BaseUrl/events/$eventId/ticket-types")

$currentTicket = $currentTicketTypes |
    Where-Object { $_.id -eq $ticketTypeId } |
    Select-Object -First 1

Test-Value `
    -Name "Stock refleja quantity 2" `
    -Actual $currentTicket.available `
    -Expected ($initialAvailable - 2)

# ---------------------------------------------------------
# 11. Actualizar quantity 2 -> 1
# ---------------------------------------------------------

Test-Status `
    -Name "Actualizar ReservationItem quantity 2 a 1" `
    -Method "PATCH" `
    -Uri "$BaseUrl/reservation-items/$reservationItem1Id" `
    -ExpectedStatus 200 `
    -Body @{
        quantity = 1
    }

# ---------------------------------------------------------
# 12. Eliminar ReservationItem
# ---------------------------------------------------------

Test-Status `
    -Name "Eliminar ReservationItem y liberar stock" `
    -Method "DELETE" `
    -Uri "$BaseUrl/reservation-items/$reservationItem1Id" `
    -ExpectedStatus 200

# ---------------------------------------------------------
# 13. Verificar restauracion
# ---------------------------------------------------------

$currentTicketTypes = @(Get-Json "$BaseUrl/events/$eventId/ticket-types")

$currentTicket = $currentTicketTypes |
    Where-Object { $_.id -eq $ticketTypeId } |
    Select-Object -First 1

Test-Value `
    -Name "Stock vuelve al valor inicial despues de eliminar Item" `
    -Actual $currentTicket.available `
    -Expected $initialAvailable

# ---------------------------------------------------------
# 14. Eliminar Reservation vacia
# ---------------------------------------------------------

Test-Status `
    -Name "Eliminar Reservation despues de liberar Items" `
    -Method "DELETE" `
    -Uri "$BaseUrl/reservations/$reservation1Id" `
    -ExpectedStatus 200

# =========================================================
# FLUJO 2 - SEAT
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 2 - SEAT"
Write-Host "========================================="

# ---------------------------------------------------------
# 15. Segundo Cart
# ---------------------------------------------------------

$cart2 = Test-Status `
    -Name "Crear segundo Cart" `
    -Method "POST" `
    -Uri "$BaseUrl/users/$userId/cart" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
    }

if ($null -eq $cart2) {
    exit
}

$cart2Id = $cart2.id

# ---------------------------------------------------------
# 16. CartItem
# ---------------------------------------------------------

Test-Status `
    -Name "Agregar Ticket al segundo Cart" `
    -Method "POST" `
    -Uri "$BaseUrl/carts/$cart2Id/items" `
    -ExpectedStatus 201 `
    -Body @{
        ticketTypeId = $seatTicketTypeId
        quantity = 1
    }

# ---------------------------------------------------------
# 17. Reservation 2
# ---------------------------------------------------------

$reservation2 = Test-Status `
    -Name "Crear segunda Reservation" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
        cartId = $cart2Id
    }

if ($null -eq $reservation2) {
    exit
}

$reservation2Id = $reservation2.id

# ---------------------------------------------------------
# 18. Reservar Seat
# ---------------------------------------------------------

$reservationItemSeat = Test-Status `
    -Name "Reservar Seat correctamente" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations/$reservation2Id/items" `
    -ExpectedStatus 201 `
    -Body @{
        ticketTypeId = $seatTicketTypeId
        quantity = 1
        seatId = $seatId
    }

if ($null -eq $reservationItemSeat) {
    exit
}

$reservationItemSeatId = $reservationItemSeat.id

# ---------------------------------------------------------
# 19. Seat RESERVED
# ---------------------------------------------------------

$currentSeats = @(Get-Json "$BaseUrl/events/$eventId/seats")

$currentSeat = $currentSeats |
    Where-Object { $_.id -eq $seatId } |
    Select-Object -First 1

Test-Value `
    -Name "Seat cambia a RESERVED" `
    -Actual $currentSeat.status `
    -Expected "RESERVED"

# ---------------------------------------------------------
# 20. Quantity > 1 con Seat
# ---------------------------------------------------------

Test-Status `
    -Name "Seat con quantity mayor que 1" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations/$reservation2Id/items" `
    -ExpectedStatus 400 `
    -Body @{
        ticketTypeId = $seatTicketTypeId
        quantity = 2
        seatId = $seatId
    }

# =========================================================
# FLUJO 3 - SEAT YA RESERVADO
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 3 - SEAT YA RESERVADO"
Write-Host "========================================="

# ---------------------------------------------------------
# 21. Crear tercer Cart
# ---------------------------------------------------------

$cart3 = Test-Status `
    -Name "Crear tercer Cart" `
    -Method "POST" `
    -Uri "$BaseUrl/users/$userId/cart" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
    }

if ($null -eq $cart3) {
    exit
}

$cart3Id = $cart3.id

# ---------------------------------------------------------
# 22. CartItem tercero
# ---------------------------------------------------------

Test-Status `
    -Name "Agregar Ticket al tercer Cart" `
    -Method "POST" `
    -Uri "$BaseUrl/carts/$cart3Id/items" `
    -ExpectedStatus 201 `
    -Body @{
        ticketTypeId = $seatTicketTypeId
        quantity = 1
    }

# ---------------------------------------------------------
# 23. Reservation 3
# ---------------------------------------------------------

$reservation3 = Test-Status `
    -Name "Crear tercera Reservation" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations" `
    -ExpectedStatus 201 `
    -Body @{
        userId = $userId
        eventId = $eventId
        cartId = $cart3Id
    }

if ($null -eq $reservation3) {
    exit
}

$reservation3Id = $reservation3.id

# ---------------------------------------------------------
# 24. Seat ya reservado
# ---------------------------------------------------------

Test-Status `
    -Name "Intentar reservar Seat ya RESERVED" `
    -Method "POST" `
    -Uri "$BaseUrl/reservations/$reservation3Id/items" `
    -ExpectedStatus 400 `
    -Body @{
        ticketTypeId = $seatTicketTypeId
        quantity = 1
        seatId = $seatId
    }

# =========================================================
# FLUJO 4 - VALIDACIONES DE EVENTO
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 4 - VALIDACIONES DE EVENTO"
Write-Host "========================================="

# ---------------------------------------------------------
# 25. Buscar TicketType de otro evento
# ---------------------------------------------------------

$events = @(Get-Json "$BaseUrl/events")

$otherEventTicketTypeId = $null
$otherEventId = $null

foreach ($event in $events) {

    if ($event.id -eq $eventId) {
        continue
    }

    $candidateTicketTypes = @(Get-Json "$BaseUrl/events/$($event.id)/ticket-types")

    $candidateTicket = $candidateTicketTypes |
        Where-Object {
            $_.available -ge 1
        } |
        Select-Object -First 1

    if ($null -ne $candidateTicket) {
        $otherEventId = $event.id
        $otherEventTicketTypeId = $candidateTicket.id
        break
    }
}

if ($null -eq $otherEventTicketTypeId) {
    Write-Host ""
    Write-Host "No fue posible encontrar un TicketType de otro evento."
    $failed++
}
else {

    Write-Host ""
    Write-Host "Otro evento seleccionado: $otherEventId"
    Write-Host "TicketType de otro evento: $otherEventTicketTypeId"

    # -----------------------------------------------------
    # 26. TicketType de otro evento
    # -----------------------------------------------------

    Test-Status `
        -Name "TicketType de otro evento" `
        -Method "POST" `
        -Uri "$BaseUrl/reservations/$reservation3Id/items" `
        -ExpectedStatus 400 `
        -Body @{
            ticketTypeId = $otherEventTicketTypeId
            quantity = 1
        }

    # -----------------------------------------------------
    # 27. Buscar Seat disponible de otro evento
    # -----------------------------------------------------

    $otherEventSeatId = $null

    foreach ($event in $events) {

        if ($event.id -eq $eventId) {
            continue
        }

        $candidateSeats = @(Get-Json "$BaseUrl/events/$($event.id)/seats")

        $candidateSeat = $candidateSeats |
            Where-Object {
                $_.status -eq "AVAILABLE"
            } |
            Select-Object -First 1

        if ($null -ne $candidateSeat) {
            $otherEventSeatId = $candidateSeat.id
            $otherEventSeatEventId = $event.id
            break
        }
    }

    if ($null -eq $otherEventSeatId) {
        Write-Host ""
        Write-Host "No fue posible encontrar un Seat AVAILABLE de otro evento."
        $failed++
    }
    else {

        Write-Host ""
        Write-Host "Seat de otro evento: $otherEventSeatId"
        Write-Host "Pertenece al evento: $otherEventSeatEventId"

        # -------------------------------------------------
        # 28. Seat de otro evento
        # -------------------------------------------------

        Test-Status `
            -Name "Rechazar Seat de otro evento" `
            -Method "POST" `
            -Uri "$BaseUrl/reservations/$reservation3Id/items" `
            -ExpectedStatus 400 `
            -Body @{
                ticketTypeId = $seatTicketTypeId
                quantity = 1
                seatId = $otherEventSeatId
            }
    }
}

# =========================================================
# FLUJO 5 - ZONA
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 5 - ZONA"
Write-Host "========================================="

# ---------------------------------------------------------
# Obtener zonas del evento
# ---------------------------------------------------------

$zones = @(Get-Json "$BaseUrl/events/$eventId/zones")

$incompatibleZone = $zones |
    Where-Object {
        $_.id -ne $seatZoneId
    } |
    Select-Object -First 1

$createdTestZoneId = $null
$createdTestSeatId = $null

# ---------------------------------------------------------
# Si no existe otra Zone, crear datos de prueba
# ---------------------------------------------------------

if ($null -eq $incompatibleZone) {

    Write-Host ""
    Write-Host "No existe otra Zone. Se crearan datos temporales para la prueba."

    $timestamp = [DateTime]::UtcNow.ToString("HHmmssfff")

    $testZoneName = "TEST-ZONE-$timestamp"

    $createdZone = Test-Status `
        -Name "Crear Zone temporal para prueba de incompatibilidad" `
        -Method "POST" `
        -Uri "$BaseUrl/events/$eventId/zones" `
        -ExpectedStatus 201 `
        -Body @{
            name = $testZoneName
            capacity = 10
            description = "Zone temporal creada por test"
        }

    if ($null -eq $createdZone) {
        Write-Host ""
        Write-Host "No fue posible crear Zone temporal."
        $failed++
    }
    else {

        $createdTestZoneId = $createdZone.id
        $incompatibleZone = $createdZone

        $testRow = "T$timestamp"

        $createdSeat = Test-Status `
            -Name "Crear Seat temporal en Zone incompatible" `
            -Method "POST" `
            -Uri "$BaseUrl/events/$eventId/seats" `
            -ExpectedStatus 201 `
            -Body @{
                row = $testRow
                number = 1
                zoneId = $createdTestZoneId
            }

        if ($null -eq $createdSeat) {
            Write-Host ""
            Write-Host "No fue posible crear Seat temporal."

            if ($createdTestZoneId) {
                Test-Status `
                    -Name "Eliminar Zone temporal despues de fallo" `
                    -Method "DELETE" `
                    -Uri "$BaseUrl/zones/$createdTestZoneId" `
                    -ExpectedStatus 200
            }

            $failed++
            $incompatibleZone = $null
            $createdTestZoneId = $null
        }
        else {
            $createdTestSeatId = $createdSeat.id
        }
    }
}

# ---------------------------------------------------------
# 29. Zone incompatible
# ---------------------------------------------------------

if ($null -ne $incompatibleZone) {

    $incompatibleSeatId = $createdTestSeatId

    if ($null -eq $incompatibleSeatId) {

        $eventSeats = @(Get-Json "$BaseUrl/events/$eventId/seats")

        $incompatibleSeat = $eventSeats |
            Where-Object {
                $_.zoneId -eq $incompatibleZone.id -and
                $_.status -eq "AVAILABLE"
            } |
            Select-Object -First 1

        if ($null -ne $incompatibleSeat) {
            $incompatibleSeatId = $incompatibleSeat.id
        }
    }

    if ($null -eq $incompatibleSeatId) {

        Write-Host ""
        Write-Host "No existe Seat AVAILABLE en la Zone incompatible."
        $failed++
    }
    else {

        Write-Host ""
        Write-Host "Zone del TicketType: $seatZoneId"
        Write-Host "Zone del Seat incompatible: $($incompatibleZone.id)"
        Write-Host "Seat incompatible: $incompatibleSeatId"

        Test-Status `
            -Name "Rechazar Seat de Zone incompatible" `
            -Method "POST" `
            -Uri "$BaseUrl/reservations/$reservation3Id/items" `
            -ExpectedStatus 400 `
            -Body @{
                ticketTypeId = $seatTicketTypeId
                quantity = 1
                seatId = $incompatibleSeatId
            }
    }
}

# =========================================================
# FLUJO 6 - CANCELACION Y ZONA COMPATIBLE
# =========================================================

Write-Host ""
Write-Host "========================================="
Write-Host "FLUJO 6 - CANCELACION Y ZONA COMPATIBLE"
Write-Host "========================================="

# ---------------------------------------------------------
# 30. Cancelar Reservation 2
# ---------------------------------------------------------

Test-Status `
    -Name "Cancelar Reservation que tiene Seat" `
    -Method "PATCH" `
    -Uri "$BaseUrl/reservations/$reservation2Id" `
    -ExpectedStatus 200 `
    -Body @{
        status = "CANCELLED"
    }

# ---------------------------------------------------------
# 31. Seat liberado
# ---------------------------------------------------------

$currentSeats = @(Get-Json "$BaseUrl/events/$eventId/seats")

$currentSeat = $currentSeats |
    Where-Object { $_.id -eq $seatId } |
    Select-Object -First 1

Test-Value `
    -Name "Seat vuelve a AVAILABLE despues de cancelar Reservation" `
    -Actual $currentSeat.status `
    -Expected "AVAILABLE"

# ---------------------------------------------------------
# 32. Stock liberado
# ---------------------------------------------------------

$currentTicketTypes = @(Get-Json "$BaseUrl/events/$eventId/ticket-types")

$currentSeatTicket = $currentTicketTypes |
    Where-Object { $_.id -eq $seatTicketTypeId } |
    Select-Object -First 1

Test-Value `
    -Name "TicketType.available se libera al cancelar Reservation" `
    -Actual $currentSeatTicket.available `
    -Expected $seatInitialAvailable

# ---------------------------------------------------------
# 33. Zone compatible
# ---------------------------------------------------------

$compatibleSeat = @(Get-Json "$BaseUrl/events/$eventId/seats") |
    Where-Object {
        $_.id -eq $seatId -and
        $_.zoneId -eq $seatZoneId -and
        $_.status -eq "AVAILABLE"
    } |
    Select-Object -First 1

if ($null -eq $compatibleSeat) {

    Write-Host ""
    Write-Host "No existe Seat AVAILABLE para probar Zone compatible."
    $failed++
}
else {

    $compatibleZoneItem = Test-Status `
        -Name "Permitir TicketType y Seat de la misma Zone" `
        -Method "POST" `
        -Uri "$BaseUrl/reservations/$reservation3Id/items" `
        -ExpectedStatus 201 `
        -Body @{
            ticketTypeId = $seatTicketTypeId
            quantity = 1
            seatId = $seatId
        }

    # -----------------------------------------------------
    # 34. Eliminar Item de Zone compatible
    # -----------------------------------------------------

    if ($null -ne $compatibleZoneItem) {

        Test-Status `
            -Name "Eliminar ReservationItem de Zone compatible" `
            -Method "DELETE" `
            -Uri "$BaseUrl/reservation-items/$($compatibleZoneItem.id)" `
            -ExpectedStatus 200
    }
}

# ---------------------------------------------------------
# 35. Eliminar Reservation 2
# ---------------------------------------------------------

Test-Status `
    -Name "Eliminar Reservation cancelada" `
    -Method "DELETE" `
    -Uri "$BaseUrl/reservations/$reservation2Id" `
    -ExpectedStatus 200

# ---------------------------------------------------------
# 36. Eliminar Reservation 3
# ---------------------------------------------------------

Test-Status `
    -Name "Eliminar tercera Reservation" `
    -Method "DELETE" `
    -Uri "$BaseUrl/reservations/$reservation3Id" `
    -ExpectedStatus 200

# =========================================================
# LIMPIEZA DE DATOS TEMPORALES DE ZONA
# =========================================================

if ($null -ne $createdTestSeatId) {

    Test-Status `
        -Name "Eliminar Seat temporal" `
        -Method "DELETE" `
        -Uri "$BaseUrl/seats/$createdTestSeatId" `
        -ExpectedStatus 200
}

if ($null -ne $createdTestZoneId) {

    Test-Status `
        -Name "Eliminar Zone temporal" `
        -Method "DELETE" `
        -Uri "$BaseUrl/zones/$createdTestZoneId" `
        -ExpectedStatus 200
}

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
    Write-Host "TODOS LOS TESTS PASARON"
}
else {
    Write-Host "HAY TESTS FALLIDOS"
}

