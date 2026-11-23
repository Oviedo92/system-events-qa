import { test, expect } from '../fixtures/eventia.fixtures';

// Arreglo de casos para ejecución Data-Driven con 3 perfiles de promotor
const PROMOTER_CASES = [
  {
    label: 'Natural Person with Citizenship ID (CC)',
    personType: 'NATURAL' as const,
    brandName: 'Acordeon Live Valledupar',
    docNumber: '1065890111',
  },
  {
    label: 'Juridical Person S.A.S. with NIT',
    personType: 'JURIDICAL' as const,
    brandName: 'Conciertos del Cesar S.A.S.',
    docNumber: '901456789',
  },
  {
    label: 'Natural Person with Foreigner ID (CE)',
    personType: 'NATURAL' as const,
    brandName: 'Caribe Fest Producciones',
    docNumber: '48921034',
  },
];

test.describe('Critical Flow 1: Express Registration and KYC Verification', () => {
  test('automatically calculates NIT Verification Digit (DV) for Juridical Person', async ({
    promoterKycPage,
  }) => {
    // Arrange: abrir el formulario de expediente KYC
    await promoterKycPage.goto();

    // Act: seleccionar Persona Jurídica e ingresar NIT base
    await promoterKycPage.fillNitAndCheckAutoDv('901234567');

    // Assert: comprobar cálculo automático del dígito verificador DIAN
    await expect(promoterKycPage.nitDvInput).toHaveValue('7');
  });

  test('[Negative] rejects Phase 1 registration when terms and Law 1581 are not accepted', async ({
    registerPromoterPage,
  }) => {
    // Arrange: navegar al registro de promotor
    await registerPromoterPage.goto();

    // Act: intentar registrar sin marcar la casilla de aceptación legal
    await registerPromoterPage.registerPromoterPhase1({
      brandName: 'Productora Sin Terminos',
      personType: 'NATURAL',
      phone: '+57 300 111 2233',
      documentNumber: '1065000111',
      email: `noterms_${Date.now()}@eventia.com`,
      password: 'Password123*',
      acceptTerms: false,
    });

    // Assert: validar mensaje de error exigiendo aceptación de Ley 1581
    await expect(registerPromoterPage.errorMessage).toContainText(/Ley 1581/i);
  });

  test('[Negative] blocks KYC submission for Natural Person under 18 years old', async ({
    registerPromoterPage,
    promoterKycPage,
  }) => {
    // Arrange: crear cuenta express Fase 1 y acceder al formulario KYC
    const uniqueEmail = `underage_${Date.now()}@eventia.com`;
    await registerPromoterPage.goto();
    await registerPromoterPage.registerPromoterPhase1({
      brandName: 'Eventos Juveniles',
      personType: 'NATURAL',
      phone: '+57 300 999 8877',
      documentNumber: '1065999888',
      email: uniqueEmail,
      password: 'Password123*',
    });
    await expect(promoterKycPage.naturalButton).toBeVisible();

    // Act: completar expediente KYC con fecha de nacimiento de menor de edad y firmar
    await promoterKycPage.submitNaturalKyc({
      firstName: 'Juan',
      lastName: 'Menor',
      docNumber: '1065999888',
      birthDate: '2012-06-15',
      businessName: 'Eventos Juveniles',
    });

    // Assert: verificar rechazo del servidor por mayoría de edad
    await expect(promoterKycPage.errorMessage).toContainText(/mayor de 18 años/i);
  });

  for (const scenario of PROMOTER_CASES) {
    test(`[Data-Driven] allows Phase 1 registration for ${scenario.label}`, async ({
      registerPromoterPage,
      promoterKycPage,
    }) => {
      // Arrange: generar correo único para cada caso del arreglo Data-Driven
      const uniqueEmail = `dd_${Date.now()}_${Math.floor(Math.random() * 999)}@eventia.com`;
      await registerPromoterPage.goto();

      // Act: ejecutar registro express con los datos del escenario actual
      await registerPromoterPage.registerPromoterPhase1({
        brandName: scenario.brandName,
        personType: scenario.personType,
        phone: '+57 301 234 5678',
        documentNumber: scenario.docNumber,
        email: uniqueEmail,
        password: 'Password123*',
      });

      // Assert: confirmar redirección a Fase 2 (/promoter/application)
      await expect(promoterKycPage.page).toHaveURL(/\/promoter\/application/);
    });
  }
});