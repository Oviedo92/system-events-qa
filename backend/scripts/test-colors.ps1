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

Write-Host ""
Write-Host "========================================"
Write-Host "TEST COLORS - EVENTIA"
Write-Host "========================================"


# ============================================================
# 1. CREAR COLOR
# ============================================================

$color = Test-Request `
    -Name "Crear color válido" `
    -Method "POST" `
    -Url "$baseUrl/colors" `
    -Body @{
        name = "Azul EVENTIA"
        hex = "#0066FF"
    } `
    -ExpectedStatus 201

$colorData = $color.Content | ConvertFrom-Json
$colorId = $colorData.id

Write-Host "Color creado: $colorId"


# ============================================================
# 2. OBTENER TODOS LOS COLORES
# ============================================================

Test-Request `
    -Name "Obtener todos los colores" `
    -Method "GET" `
    -Url "$baseUrl/colors" `
    -ExpectedStatus 200


# ============================================================
# 3. OBTENER COLOR POR ID
# ============================================================

Test-Request `
    -Name "Obtener color por ID" `
    -Method "GET" `
    -Url "$baseUrl/colors/$colorId" `
    -ExpectedStatus 200


# ============================================================
# 4. ACTUALIZAR COLOR
# ============================================================

Test-Request `
    -Name "Actualizar color" `
    -Method "PATCH" `
    -Url "$baseUrl/colors/$colorId" `
    -Body @{
        name = "Azul EVENTIA Actualizado"
        hex = "#0033CC"
    } `
    -ExpectedStatus 200


# ============================================================
# 5. HEX INVÁLIDO
# ============================================================

Test-Request `
    -Name "HEX inválido debe ser rechazado" `
    -Method "POST" `
    -Url "$baseUrl/colors" `
    -Body @{
        name = "Color inválido"
        hex = "azul"
    } `
    -ExpectedStatus 400


# ============================================================
# 6. HEX CON FORMATO INCORRECTO
# ============================================================

Test-Request `
    -Name "HEX corto debe ser rechazado" `
    -Method "POST" `
    -Url "$baseUrl/colors" `
    -Body @{
        name = "Color inválido 2"
        hex = "#FFF"
    } `
    -ExpectedStatus 400


# ============================================================
# 7. NOMBRE VACÍO
# ============================================================

Test-Request `
    -Name "Nombre vacío debe ser rechazado" `
    -Method "POST" `
    -Url "$baseUrl/colors" `
    -Body @{
        name = ""
        hex = "#FFFFFF"
    } `
    -ExpectedStatus 400


# ============================================================
# 8. COLOR INEXISTENTE
# ============================================================

Test-Request `
    -Name "Obtener color inexistente" `
    -Method "GET" `
    -Url "$baseUrl/colors/999999" `
    -ExpectedStatus 404


# ============================================================
# 9. ACTUALIZAR COLOR INEXISTENTE
# ============================================================

Test-Request `
    -Name "Actualizar color inexistente" `
    -Method "PATCH" `
    -Url "$baseUrl/colors/999999" `
    -Body @{
        name = "No existe"
    } `
    -ExpectedStatus 404


# ============================================================
# 10. ELIMINAR COLOR
# ============================================================

Test-Request `
    -Name "Eliminar color" `
    -Method "DELETE" `
    -Url "$baseUrl/colors/$colorId" `
    -ExpectedStatus 200


# ============================================================
# 11. ELIMINAR COLOR NUEVAMENTE
# ============================================================

Test-Request `
    -Name "Eliminar color inexistente después del DELETE" `
    -Method "DELETE" `
    -Url "$baseUrl/colors/$colorId" `
    -ExpectedStatus 404


# ============================================================
# RESUMEN
# ============================================================

Write-Host ""
Write-Host "========================================"
Write-Host "RESUMEN TEST COLORS"
Write-Host "========================================"

Write-Host "PASS: $passed"
Write-Host "FAIL: $failed"

if ($failed -eq 0) {
    Write-Host ""
    Write-Host "TODAS LAS PRUEBAS PASARON"
}
else {
    Write-Host ""
    Write-Host "HAY PRUEBAS FALLIDAS"
}