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
Write-Host "TEST SIZES - EVENTIA"
Write-Host "========================================"


# ============================================================
# 1. CREAR TALLA
# ============================================================

$size = Test-Request `
    -Name "Crear talla válida" `
    -Method "POST" `
    -Url "$baseUrl/sizes" `
    -Body @{
        system = "EU"
        value = "M"
        normalizedCm = 50
    } `
    -ExpectedStatus 201

$sizeData = $size.Content | ConvertFrom-Json
$sizeId = $sizeData.id

Write-Host "Talla creada: $sizeId"


# ============================================================
# 2. OBTENER TODAS LAS TALLAS
# ============================================================

Test-Request `
    -Name "Obtener todas las tallas" `
    -Method "GET" `
    -Url "$baseUrl/sizes" `
    -ExpectedStatus 200


# ============================================================
# 3. OBTENER TALLA POR ID
# ============================================================

Test-Request `
    -Name "Obtener talla por ID" `
    -Method "GET" `
    -Url "$baseUrl/sizes/$sizeId" `
    -ExpectedStatus 200


# ============================================================
# 4. ACTUALIZAR TALLA
# ============================================================

Test-Request `
    -Name "Actualizar talla" `
    -Method "PATCH" `
    -Url "$baseUrl/sizes/$sizeId" `
    -Body @{
        system = "EU"
        value = "L"
        normalizedCm = 52
    } `
    -ExpectedStatus 200


# ============================================================
# 5. SYSTEM VACÍO
# ============================================================

Test-Request `
    -Name "System vacío debe ser rechazado" `
    -Method "POST" `
    -Url "$baseUrl/sizes" `
    -Body @{
        system = ""
        value = "M"
        normalizedCm = 50
    } `
    -ExpectedStatus 400


# ============================================================
# 6. VALUE VACÍO
# ============================================================

Test-Request `
    -Name "Value vacío debe ser rechazado" `
    -Method "POST" `
    -Url "$baseUrl/sizes" `
    -Body @{
        system = "EU"
        value = ""
        normalizedCm = 50
    } `
    -ExpectedStatus 400


# ============================================================
# 7. NORMALIZED CM NEGATIVO
# ============================================================

Test-Request `
    -Name "NormalizedCm negativo debe ser rechazado" `
    -Method "POST" `
    -Url "$baseUrl/sizes" `
    -Body @{
        system = "EU"
        value = "XL"
        normalizedCm = -10
    } `
    -ExpectedStatus 400


# ============================================================
# 8. TALLA INEXISTENTE
# ============================================================

Test-Request `
    -Name "Obtener talla inexistente" `
    -Method "GET" `
    -Url "$baseUrl/sizes/999999" `
    -ExpectedStatus 404


# ============================================================
# 9. ACTUALIZAR TALLA INEXISTENTE
# ============================================================

Test-Request `
    -Name "Actualizar talla inexistente" `
    -Method "PATCH" `
    -Url "$baseUrl/sizes/999999" `
    -Body @{
        value = "XXL"
    } `
    -ExpectedStatus 404


# ============================================================
# 10. ELIMINAR TALLA
# ============================================================

Test-Request `
    -Name "Eliminar talla" `
    -Method "DELETE" `
    -Url "$baseUrl/sizes/$sizeId" `
    -ExpectedStatus 200


# ============================================================
# 11. ELIMINAR TALLA NUEVAMENTE
# ============================================================

Test-Request `
    -Name "Eliminar talla inexistente después del DELETE" `
    -Method "DELETE" `
    -Url "$baseUrl/sizes/$sizeId" `
    -ExpectedStatus 404


# ============================================================
# RESUMEN
# ============================================================

Write-Host ""
Write-Host "========================================"
Write-Host "RESUMEN TEST SIZES"
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