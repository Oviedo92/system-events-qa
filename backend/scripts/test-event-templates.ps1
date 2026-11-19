$baseUrl = "http://localhost:3000"

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

        Write-Host "Status recibido: $status"
        Write-Host "Status esperado: $ExpectedStatus"

        if ($status -eq $ExpectedStatus) {
            Write-Host "PASS"
        } else {
            Write-Host "FAIL"
        }

        return $response
    }
    catch {
        $status = 0

        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        }

        Write-Host "Status recibido: $status"
        Write-Host "Status esperado: $ExpectedStatus"

        if ($status -eq $ExpectedStatus) {
            Write-Host "PASS"
        } else {
            Write-Host "FAIL"
            Write-Host $_.Exception.Message
        }

        return $null
    }
}

Write-Host ""
Write-Host "========================================"
Write-Host "TEST DE TEMPLATES - EVENTIA"
Write-Host "========================================"


# ==========================================================
# TEMPLATE 1 - AUDITORIO CON ASIENTOS
# usesZones = false
# usesSeats = true
# ==========================================================

$event1 = Test-Request `
    -Name "Template 1 - Crear evento" `
    -Method "POST" `
    -Url "$baseUrl/events" `
    -Body @{
        name = "Test Template 1"
        description = "Prueba automatizada template 1"
        date = "2027-02-01T20:00:00.000Z"
        organizerId = 1
        templateId = 1
    } `
    -ExpectedStatus 201

$event1Data = $event1.Content | ConvertFrom-Json
$event1Id = $event1Data.id

Write-Host "Evento creado: $event1Id"


Test-Request `
    -Name "Template 1 - Zona debe estar bloqueada" `
    -Method "POST" `
    -Url "$baseUrl/events/$event1Id/zones" `
    -Body @{
        name = "Zona no permitida"
        capacity = 100
        description = "No debería crearse"
    } `
    -ExpectedStatus 400


Test-Request `
    -Name "Template 1 - Asiento debe estar permitido" `
    -Method "POST" `
    -Url "$baseUrl/events/$event1Id/seats" `
    -Body @{
        row = "A"
        number = 1
    } `
    -ExpectedStatus 201


# ==========================================================
# TEMPLATE 2 - FESTIVAL POR ZONAS
# usesZones = true
# usesSeats = false
# ==========================================================

$event2 = Test-Request `
    -Name "Template 2 - Crear evento" `
    -Method "POST" `
    -Url "$baseUrl/events" `
    -Body @{
        name = "Test Template 2"
        description = "Prueba automatizada template 2"
        date = "2027-02-02T20:00:00.000Z"
        organizerId = 1
        templateId = 2
    } `
    -ExpectedStatus 201

$event2Data = $event2.Content | ConvertFrom-Json
$event2Id = $event2Data.id

Write-Host "Evento creado: $event2Id"


Test-Request `
    -Name "Template 2 - Zona debe estar permitida" `
    -Method "POST" `
    -Url "$baseUrl/events/$event2Id/zones" `
    -Body @{
        name = "Zona General"
        capacity = 500
        description = "Zona permitida"
    } `
    -ExpectedStatus 201


Test-Request `
    -Name "Template 2 - Asiento debe estar bloqueado" `
    -Method "POST" `
    -Url "$baseUrl/events/$event2Id/seats" `
    -Body @{
        row = "A"
        number = 1
    } `
    -ExpectedStatus 400


# ==========================================================
# TEMPLATE 3 - EVENTO LIBRE
# usesZones = false
# usesSeats = false
# ==========================================================

$event3 = Test-Request `
    -Name "Template 3 - Crear evento" `
    -Method "POST" `
    -Url "$baseUrl/events" `
    -Body @{
        name = "Test Template 3"
        description = "Prueba automatizada template 3"
        date = "2027-02-03T20:00:00.000Z"
        organizerId = 1
        templateId = 3
    } `
    -ExpectedStatus 201

$event3Data = $event3.Content | ConvertFrom-Json
$event3Id = $event3Data.id

Write-Host "Evento creado: $event3Id"


Test-Request `
    -Name "Template 3 - Zona debe estar bloqueada" `
    -Method "POST" `
    -Url "$baseUrl/events/$event3Id/zones" `
    -Body @{
        name = "Zona no permitida"
        capacity = 100
        description = "No debería crearse"
    } `
    -ExpectedStatus 400


Test-Request `
    -Name "Template 3 - Asiento debe estar bloqueado" `
    -Method "POST" `
    -Url "$baseUrl/events/$event3Id/seats" `
    -Body @{
        row = "A"
        number = 1
    } `
    -ExpectedStatus 400


Write-Host ""
Write-Host "========================================"
Write-Host "FIN DE LAS PRUEBAS"
Write-Host "========================================"