$baseUrl = "http://localhost:3000"

# CAMBIA SOLO ESTE ID por un Payment actualmente PENDING
$paymentId = 1

Write-Host "`n=== 1. CONSULTAR PAYMENT ANTES ===" -ForegroundColor Cyan

try {
    $before = Invoke-RestMethod `
        -Uri "$baseUrl/payments/$paymentId" `
        -Method Get

    Write-Host "Payment ID: $($before.id)"
    Write-Host "Payment status: $($before.status)"
    Write-Host "Order ID: $($before.order.id)"
    Write-Host "Order status: $($before.order.status)"

    if ($before.status -ne "PENDING") {
        Write-Host "FAIL: El Payment no está PENDING." -ForegroundColor Red
        exit 1
    }

    if ($before.order.status -ne "PENDING") {
        Write-Host "FAIL: La Order no está PENDING." -ForegroundColor Red
        exit 1
    }

    $orderId = $before.order.id
}
catch {
    Write-Host "FAIL: No se pudo consultar el Payment." -ForegroundColor Red
    Write-Host $_
    exit 1
}

Write-Host "`n=== 2. CONSULTAR TICKETS ANTES ===" -ForegroundColor Cyan

try {
    $ticketsBefore = Invoke-RestMethod `
        -Uri "$baseUrl/orders/$orderId/tickets" `
        -Method Get

    $beforeCount = @($ticketsBefore).Count

    Write-Host "Tickets antes: $beforeCount"
}
catch {
    Write-Host "FAIL: No se pudieron consultar los Tickets." -ForegroundColor Red
    Write-Host $_
    exit 1
}

Write-Host "`n=== 3. APROBAR PAYMENT ===" -ForegroundColor Cyan

$body = @{
    status = "APPROVED"
} | ConvertTo-Json

try {
    $approved = Invoke-RestMethod `
        -Uri "$baseUrl/payments/$paymentId" `
        -Method Patch `
        -ContentType "application/json" `
        -Body $body

    Write-Host "Payment status después: $($approved.status)"
    Write-Host "Order status después: $($approved.order.status)"
}
catch {
    Write-Host "FAIL: No se pudo aprobar el Payment." -ForegroundColor Red
    Write-Host $_
    exit 1
}

Write-Host "`n=== 4. CONSULTAR TICKETS DESPUÉS ===" -ForegroundColor Cyan

try {
    $ticketsAfter = Invoke-RestMethod `
        -Uri "$baseUrl/orders/$orderId/tickets" `
        -Method Get

    $afterCount = @($ticketsAfter).Count

    Write-Host "Tickets después: $afterCount"

    if ($approved.status -ne "APPROVED") {
        Write-Host "FAIL: Payment no quedó APPROVED." -ForegroundColor Red
        exit 1
    }

    if ($approved.order.status -ne "PAID") {
        Write-Host "FAIL: Order no quedó PAID." -ForegroundColor Red
        exit 1
    }

    if ($afterCount -le $beforeCount) {
        Write-Host "FAIL: No se generó ningún Ticket nuevo." -ForegroundColor Red
        exit 1
    }

    $activeTickets = @(
        $ticketsAfter | Where-Object { $_.status -eq "ACTIVE" }
    )

    if ($activeTickets.Count -eq 0) {
        Write-Host "FAIL: Se generaron Tickets, pero ninguno está ACTIVE." -ForegroundColor Red
        exit 1
    }

    Write-Host "`nPASS: Payment APPROVED." -ForegroundColor Green
    Write-Host "PASS: Order PAID." -ForegroundColor Green
    Write-Host "PASS: Se generó al menos un Ticket ACTIVE." -ForegroundColor Green
}
catch {
    Write-Host "FAIL: No se pudieron consultar los Tickets después." -ForegroundColor Red
    Write-Host $_
    exit 1
}

Write-Host "`n=== RESULTADO FINAL ===" -ForegroundColor Cyan
Write-Host "Payment: APPROVED"
Write-Host "Order:   PAID"
Write-Host "Tickets: $afterCount"
