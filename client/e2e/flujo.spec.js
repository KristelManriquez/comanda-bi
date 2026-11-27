/**
 * Pruebas de sistema (extremo a extremo): recorren la aplicación en el navegador
 * como lo harían el comensal, la cocina y Diego (administrador y garzón).
 */
import { expect, test } from '@playwright/test';

const MESA_1 = 'm1-7f3a9c';

async function entrar(page, correo) {
  await page.goto('/personal');
  await page.getByLabel('Correo').fill(correo);
  await page.getByLabel('Contraseña').fill('el10-2026');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/personal'));
}

test('OE1: el pedido viaja del comensal a la cocina y al garzón, y vuelve como recibido', async ({ browser }) => {
  const comensal = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const cocina = await (await browser.newContext()).newPage();
  const diego = await (await browser.newContext()).newPage();

  await entrar(cocina, 'cocina@el10.cl');
  await expect(cocina.getByText('Sin pedidos pendientes')).toBeVisible();
  await entrar(diego, 'admin@el10.cl');
  await expect(diego).toHaveURL(/\/admin/);

  // RF01 a RF04: el comensal escanea el QR, arma su pedido con una nota y lo envía
  await comensal.goto(`/mesa/${MESA_1}`);
  await comensal.locator('button[aria-label^="Hamburguesa El 10,"]').click();
  await comensal.getByRole('textbox').fill('sin cebolla');
  await comensal.getByRole('button', { name: /Agregar/ }).last().click();
  await comensal.goto(`/mesa/${MESA_1}/carrito`);
  await comensal.getByRole('button', { name: /Solicitar pedido/ }).click();
  await expect(comensal.getByText(/Solicitado/i).first()).toBeVisible();

  // RF06: llega a la cocina en tiempo real, con la nota
  await expect(cocina.getByText('sin cebolla')).toBeVisible({ timeout: 5000 });

  // RF07: Diego, como garzón, lo entrega
  await diego.goto('/garzon');
  await diego.getByRole('button', { name: /Entregado/ }).first().click();

  // RF05: el comensal ve el cambio sin recargar, y el pedido sale de la cocina
  await expect(comensal.getByText(/Recibido/i).first()).toBeVisible({ timeout: 5000 });
  await expect(cocina.getByText('Sin pedidos pendientes')).toBeVisible({ timeout: 5000 });

  // RF08: registra el pago presencial y cierra la cuenta
  await diego.getByRole('button', { name: 'Mesas', exact: true }).click();
  await diego.locator('button', { hasText: 'Cuenta abierta' }).first().click();
  await diego.getByRole('button', { name: 'Registrar pago y cerrar cuenta' }).click();
  await diego.getByRole('button', { name: 'Confirmar pago' }).click();
  await expect(diego.getByText(/Cuenta de la mesa 1 cerrada/)).toBeVisible();

  // RF11: la venta aparece en el dashboard
  await diego.getByRole('link', { name: /Administración/ }).click();
  await expect(diego.getByText('$8.990').first()).toBeVisible({ timeout: 5000 });
});

test('RF01: un QR que no existe muestra un aviso y no abre la carta', async ({ page }) => {
  await page.goto('/mesa/qr-falso');
  await expect(page.getByRole('heading', { name: 'Este código no corresponde a una mesa' })).toBeVisible();
});

test('OE2: un producto marcado como agotado no se puede pedir desde la mesa', async ({ browser }) => {
  const diego = await (await browser.newContext()).newPage();
  await entrar(diego, 'admin@el10.cl');
  await diego.goto('/admin/carta');
  const fila = diego.locator('tr', { hasText: 'La gringa' });
  await fila.locator('label').first().click();
  await expect(diego.getByText(/agotad/i).first()).toBeVisible();

  const comensal = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await comensal.goto(`/mesa/${MESA_1}`);
  const gringa = comensal.locator('button[aria-label^="La gringa,"]');
  await expect(gringa).toHaveAttribute('aria-label', /agotad/i);
});

test('RNF01: la carta se usa en un teléfono de 360 px sin desplazamiento horizontal', async ({ browser }) => {
  const page = await (await browser.newContext({ viewport: { width: 360, height: 740 } })).newPage();
  await page.goto(`/mesa/${MESA_1}`);
  await expect(page.locator('button[aria-label^="Hamburguesa El 10,"]')).toBeVisible();
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(desborde).toBeLessThanOrEqual(0);
});

test('Sesión: cerrar sesión pide confirmación y "Seguir conectado" mantiene la sesión', async ({ page }) => {
  await entrar(page, 'admin@el10.cl');
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Seguir conectado' }).click();
  await expect(page).toHaveURL(/\/admin/);
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.getByRole('button', { name: 'Sí, cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/personal/);
});

test('RF03: una bebida en lata o un jugo no se agregan sin elegir la marca o el sabor', async ({ browser }) => {
  const comensal = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await comensal.goto('/mesa/m2-b81e40');

  // El "+" rápido del jugo abre la ficha para elegir el sabor, en vez de agregarlo
  await comensal.getByRole('button', { name: /Elegir el sabor y agregar Jugo natural/ }).click();
  await expect(comensal.getByRole('dialog').getByText('Sabor')).toBeVisible();
  await comensal.getByRole('button', { name: 'Cerrar' }).click();

  // Sin marca, "Agregar" no agrega: avisa junto a las opciones
  await comensal.locator('button[aria-label^="Bebida en lata,"]').click();
  await comensal.getByRole('button', { name: /Agregar/ }).last().click();
  await expect(comensal.getByRole('alert').filter({ hasText: 'Elige la marca' })).toBeVisible();
  await expect(comensal.getByRole('dialog')).toBeVisible();

  // Con la marca elegida, se agrega y llega a la cocina con la marca
  await comensal.getByRole('radio', { name: 'Sprite' }).check();
  await comensal.getByRole('button', { name: /Agregar/ }).last().click();
  await expect(comensal.getByText('Bebida en lata (Sprite) agregado')).toBeVisible();
  await comensal.goto('/mesa/m2-b81e40/carrito');
  await expect(comensal.getByText('Sprite')).toBeVisible();
  await comensal.getByRole('button', { name: /Solicitar pedido/ }).click();

  const cocina = await (await browser.newContext()).newPage();
  await entrar(cocina, 'cocina@el10.cl');
  await expect(cocina.getByText('Sprite')).toBeVisible({ timeout: 5000 });
});
