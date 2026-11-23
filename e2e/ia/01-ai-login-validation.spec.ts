import { test, expect } from '../fixtures/eventia.fixtures';

test.describe('AI-Assisted Suite 1: Login Validation and Role Redirection', () => {
  test('[Negative] displays error alert and stays on login when credentials are invalid', async ({
    loginPage,
  }) => {
    // Arrange: navegar a la vista de inicio de sesión mediante el Page Object
    await loginPage.goto();

    // Act: intentar autenticarse con contraseña incorrecta
    await loginPage.login('admin@eventia.local', 'WrongPassword999*');

    // Assert: verificar alerta accesible y permanencia en /login
    await expect(loginPage.errorAlert).toBeVisible();
    await expect(loginPage.page).toHaveURL(/\/login/);
  });

  test('redirects authenticated administrator to admin dashboard after valid login', async ({
    loginPage,
  }) => {
    // Arrange: abrir la pantalla de inicio de sesión
    await loginPage.goto();

    // Act: iniciar sesión con credenciales reales del administrador
    await loginPage.login('admin@eventia.local', 'Ev!Admin_2026#Local');

    // Assert: comprobar redirección automática al panel administrativo
    await expect(loginPage.page).toHaveURL(/\/admin\/dashboard/);
  });
});