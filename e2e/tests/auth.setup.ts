import { test as setup, expect } from '@playwright/test';
import path from 'path';

const adminAuthFile = path.join(__dirname, '../.auth/admin.json');

setup('authenticate administrator and persist storageState', async ({ page }) => {
  // Arrange: navegar a la pantalla de inicio de sesión
  await page.goto('/login');

  // Act: ingresar credenciales reales del administrador
  await page.getByLabel(/correo/i).fill('admin@eventia.local');
  await page.getByLabel(/contraseña/i).fill('Ev!Admin_2026#Local');
  await page.getByRole('button', { name: /iniciar sesión/i }).click();

  // Assert: verificar redirección al panel de administración
  await expect(page).toHaveURL(/\/admin\/dashboard/);

  // Sincronizar sessionStorage hacia localStorage para que storageState lo conserve
  await page.evaluate(() => {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        localStorage.setItem(`__ss_${key}`, sessionStorage.getItem(key) || '');
      }
    }
  });

  await page.context().storageState({ path: adminAuthFile });
});