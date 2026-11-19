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
Write-Host "TEST PRODUCT CATEGORIES - EVENTIA"
Write-Host "========================================"


# ==========================================================
# 1. CREAR CATEGORIA
# ==========================================================

$category = Test-Request `
    -Name "Crear categoría" `
    -Method "POST" `
    -Url "$baseUrl/product-categories" `
    -Body @{
        name = "Ropa EVENTIA"
        description = "Categoría para productos de ropa"
    } `
    -ExpectedStatus 201

$categoryData = $category.Content | ConvertFrom-Json
$categoryId = $categoryData.id

Write-Host "Categoría creada: $categoryId"


# ==========================================================
# 2. GET TODAS
# ==========================================================

Test-Request `
    -Name "Obtener todas las categorías" `
    -Method "GET" `
    -Url "$baseUrl/product-categories" `
    -ExpectedStatus 200


# ==========================================================
# 3. GET UNA
# ==========================================================

Test-Request `
    -Name "Obtener categoría por ID" `
    -Method "GET" `
    -Url "$baseUrl/product-categories/$categoryId" `
    -ExpectedStatus 200


# ==========================================================
# 4. PATCH
# ==========================================================

Test-Request `
    -Name "Actualizar categoría" `
    -Method "PATCH" `
    -Url "$baseUrl/product-categories/$categoryId" `
    -Body @{
        name = "Ropa EVENTIA Actualizada"
        description = "Descripción actualizada"
    } `
    -ExpectedStatus 200


# ==========================================================
# 5. VALIDACIÓN - NOMBRE VACÍO
# ==========================================================

Test-Request `
    -Name "Nombre vacío debe ser rechazado" `
    -Method "POST" `
    -Url "$baseUrl/product-categories" `
    -Body @{
        name = ""
        description = "Categoría inválida"
    } `
    -ExpectedStatus 400


# ==========================================================
# 6. VALIDACIÓN - ID INEXISTENTE
# ==========================================================

Test-Request `
    -Name "Categoría inexistente debe devolver 404" `
    -Method "GET" `
    -Url "$baseUrl/product-categories/999999" `
    -ExpectedStatus 404


# ==========================================================
# 7. PATCH ID INEXISTENTE
# ==========================================================

Test-Request `
    -Name "Actualizar categoría inexistente" `
    -Method "PATCH" `
    -Url "$baseUrl/product-categories/999999" `
    -Body @{
        name = "No existe"
    } `
    -ExpectedStatus 404


# ==========================================================
# 8. DELETE
# ==========================================================

Test-Request `
    -Name "Eliminar categoría" `
    -Method "DELETE" `
    -Url "$baseUrl/product-categories/$categoryId" `
    -ExpectedStatus 200


# ==========================================================
# 9. DELETE NUEVAMENTE
# ==========================================================

Test-Request `
    -Name "Eliminar categoría inexistente después del DELETE" `
    -Method "DELETE" `
    -Url "$baseUrl/product-categories/$categoryId" `
    -ExpectedStatus 404


# ==========================================================
# RESUMEN
# ==========================================================

Write-Host ""
Write-Host "========================================"
Write-Host "RESUMEN PRODUCT CATEGORIES"
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