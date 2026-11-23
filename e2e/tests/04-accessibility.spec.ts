import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES_TO_AUDIT = [
  { name: 'Login Page', path: '/login' },
  { name: 'Public Events Catalog', path: '/events' },
  { name: 'Promoter Express Application (KYC)', path: '/promoter/application' },
];

test.describe('Accessibility Audits (WCAG 2.1 AA - Axe Core)', () => {
  for (const target of PAGES_TO_AUDIT) {
    test(`has zero critical or serious accessibility violations on ${target.name}`, async ({
      page,
    }) => {
      // Arrange: navegar a la vista clave de la aplicación y esperar estabilización de UI
      await page.goto(target.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(600);

      // Act: ejecutar análisis de accesibilidad WCAG 2.1 nivel A y AA
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Filtrar únicamente violaciones de impacto crítico o serio según rúbrica
      const blockingViolations = accessibilityScanResults.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      // Imprimir detalle legible en consola si existe algún defecto para documentarlo
      if (blockingViolations.length > 0) {
        console.table(
          blockingViolations.map((v) => ({
            page: target.path,
            ruleId: v.id,
            impact: v.impact,
            nodes: v.nodes.length,
            help: v.help,
          }))
        );
      }

      // Assert: la prueba debe fallar si existen violaciones critical o serious
      expect(blockingViolations).toEqual([]);
    });
  }
});