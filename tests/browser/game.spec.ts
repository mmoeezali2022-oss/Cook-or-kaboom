import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
async function start(page: Page, cozy = false) {
  await page.addInitScript(() => localStorage.setItem('cok-settings-v1', JSON.stringify({ quality: 'low', music: 0, effects: 0, reducedMotion: true, pranks: true, highContrast: false, sensitivity: 1 })));
  await page.goto('/');
  await page.getByRole('button', { name: 'Play for free' }).click();
  if (cozy) await page.getByRole('button', { name: /Cozy cooking/ }).click();
  await page.getByRole('button', { name: 'Let’s make a delicious mess' }).click();
  await expect(page.locator('.game-hud')).toBeVisible();
  await page.getByRole('button', { name: 'Kitchen map' }).click();
}
async function go(page: Page, station: string) {
  await page.locator('.station-map').getByRole('button', { name: new RegExp(station) }).click();
  await expect(page.locator('.action-button')).toContainText(station, { timeout: 25000 });
}
async function interact(page: Page) {
  await page.waitForTimeout(230); await page.locator('.action-button').click();
}
async function timed(page: Page, touch = false) {
  await interact(page); await expect(page.locator('.timing-card')).toBeVisible();
  const box = await page.locator('.timing-card .button').boundingBox();
  await page.waitForFunction(() => { const m = document.querySelector<HTMLElement>('.timing-marker'); if (!m) return false; const p = parseFloat(m.style.left); return p > 44 && p < 61; });
  if (touch) await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
  else await page.keyboard.press('KeyE');
  await expect(page.locator('.timing-card')).not.toBeVisible();
}
async function prepare(page: Page) {
  await go(page, 'Ingredient shelf'); await interact(page); await expect(page.locator('.held-item')).toContainText('Egg');
  await go(page, 'Mixing counter'); await timed(page); await expect(page.locator('.ingredient-list .done')).toHaveCount(1);
  await go(page, 'Ingredient shelf'); await interact(page); await go(page, 'Mixing counter'); await interact(page);
  await go(page, 'Fridge'); await interact(page); await go(page, 'Mixing counter'); await timed(page);
  for (let i = 1; i <= 6; i++) { await interact(page); await expect(page.locator('.ingredient-list')).toContainText(`${i}/6`); }
  await expect(page.locator('.ingredient-list')).toContainText('6/6');
  await go(page, 'Fridge'); await interact(page); await go(page, 'Stove'); await interact(page);
  await expect(page.locator('.game-message')).toContainText('pan is buttered');
}
test('a player cooks and serves all five pancakes, then exports a real PNG', async ({ page }) => {
  test.setTimeout(420_000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await start(page); await prepare(page);
  for (let i = 1; i <= 5; i++) {
    await go(page, 'Mixing counter'); await interact(page); await go(page, 'Stove'); await interact(page);
    await expect(page.locator('.pan-meter strong')).toContainText('Ready!', { timeout: 15000 }); await interact(page);
    await expect(page.locator('.pan-meter')).toContainText('SIDE TWO');
    await expect(page.locator('.pan-meter strong')).toContainText('Ready!', { timeout: 15000 }); await interact(page);
    await expect(page.locator('.held-item')).toContainText('Golden pancake');
    await go(page, 'Serving table'); await interact(page);
    await expect(page.locator('.pancake-pips .filled')).toHaveCount(i);
  }
  await expect(page.getByRole('dialog')).toContainText('Well, butter us impressed.');
  await page.screenshot({ path: 'test-results/pancake-victory.png' });
  await page.getByRole('button', { name: 'Save a memory' }).click();
  await expect(page.locator('.photo-preview img')).toBeVisible();
  const size = await page.locator('.photo-preview img').evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]);
  expect(size).toEqual([1920, 1080]);
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Save photo', exact: true }).click();
  const file = await download; expect(file.suggestedFilename()).toBe('cook-or-kaboom-wide.png'); await file.saveAs('test-results/cook-or-kaboom-wide.png'); expect(errors).toEqual([]);
});
test('camera modes, free movement, pause, settings, throwing and prank opt-out work', async ({ page }) => {
  await start(page, true);
  const camera = page.locator('.camera-control'); await expect(camera).toContainText('back');
  await page.keyboard.press('F5'); await expect(camera).toContainText('front');
  await page.keyboard.press('KeyC'); await expect(camera).toContainText('First person');
  await page.screenshot({ path: 'test-results/first-person.png' });
  await page.keyboard.press('KeyC'); await expect(camera).toContainText('back');
  await page.keyboard.down('KeyW'); await expect(page.locator('.action-button')).toContainText('Mixing counter', { timeout: 10000 }); await page.keyboard.up('KeyW');
  await go(page, 'Ingredient shelf'); await interact(page); await page.keyboard.press('KeyT');
  await expect(page.locator('.held-item')).toContainText('Room for something delicious');
  await expect(page.locator('.game-message')).toContainText('Egg-spress');
  await page.getByRole('button', { name: 'Mischief menu' }).click(); await page.getByRole('button', { name: 'Flour power' }).click();
  await expect(page.locator('.game-message')).toContainText('Mischief is off');
  await page.getByRole('button', { name: 'Pause game' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Reduced motion').uncheck(); await page.getByLabel('Music volume').fill('0.15');
  await page.getByRole('button', { name: 'Resume cooking' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cok-settings-v1')!).music)).toBe(0.15);
  await expect(page.locator('.timer')).toContainText('No rush');
  await expect.poll(() => page.locator('audio[data-soundtrack]').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0);
  expect(await page.locator('audio[data-soundtrack]').evaluate((audio: HTMLAudioElement) => ({ loop: audio.loop, volume: audio.volume, paused: audio.paused }))).toEqual({ loop: true, volume: 0.15, paused: false });
  await page.getByRole('button', { name: 'Open photo studio' }).click();
  await page.getByLabel('Format').selectOption('square');
  await expect.poll(() => page.locator('.photo-preview img').evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])).toEqual([1080, 1080]);
  await page.getByLabel('Format').selectOption('story');
  await expect.poll(() => page.locator('.photo-preview img').evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])).toEqual([1080, 1920]);
});
test('responsive touch controls and the station map can collect and use ingredients', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, baseURL: 'http://127.0.0.1:5173' });
  const page = await context.newPage();
  await start(page, true);
  await expect(page.locator('.joystick')).toBeVisible();
  const bounds = (await page.locator('.joystick').boundingBox())!; const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: bounds.x + bounds.width / 2, y: bounds.y + 5 }] });
  await expect(page.locator('.action-button')).toContainText('Mixing counter', { timeout: 10000 });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await go(page, 'Ingredient shelf'); await interact(page); await expect(page.locator('.held-item')).toContainText('Egg');
  await go(page, 'Mixing counter'); await timed(page, true);
  await expect(page.locator('.game-message')).toContainText('clean crack');
  await page.screenshot({ path: 'test-results/mobile-kitchen.png' });
  await page.getByRole('button', { name: 'Pause game' }).click(); await page.getByRole('button', { name: 'Leave kitchen' }).click();
  await expect(page.getByRole('button', { name: 'Play for free' })).toBeVisible();
  await page.screenshot({ path: 'test-results/mobile-home.png', fullPage: true });
  await context.close();
});
test('Classic mischief has a cooldown, butter causes a recoverable slip, and the sink cleans up', async ({ page }) => {
  await start(page);
  await page.keyboard.press('KeyQ');
  await expect(page.locator('.chaos-card')).toContainText('25%');
  await expect(page.locator('.game-message')).toContainText('POOF!');
  await page.getByRole('button', { name: 'Mischief menu' }).click();
  const butter = page.getByRole('button', { name: /Butter ballet/ });
  await expect(butter).toBeDisabled(); await expect(butter).toBeEnabled({ timeout: 15000 });
  await butter.click();
  await expect(page.locator('.chaos-card')).toContainText('50%');
  await page.keyboard.down('KeyS');
  await expect(page.locator('.game-message')).toContainText('butter ballet', { timeout: 7000 });
  await page.keyboard.up('KeyS');
  await page.getByRole('button', { name: 'Mischief menu' }).click();
  await go(page, 'Sink'); await interact(page);
  await expect(page.locator('.game-message')).toContainText('Squeaky clean');
  await expect(page.locator('.chaos-card')).toContainText('25%');
  await page.getByRole('button', { name: 'Emote wheel' }).click();
  await page.getByRole('button', { name: /Kitchen disco/ }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
