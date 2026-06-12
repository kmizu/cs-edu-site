import { expect, test } from '@playwright/test';

test.describe('学習フロー', () => {
  test('トップ → 庭の地図 → コース1 → レッスン1 → レッスン2', async ({ page }) => {
    await page.goto('');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('ことばだ');

    await page.getByRole('link', { name: '庭の地図を見る' }).click();
    await expect(page).toHaveURL(/\/courses\/$/);

    await page.getByRole('link', { name: /ことばとしてのプログラミング/ }).first().click();
    await expect(page).toHaveURL(/\/courses\/kotoba\/$/);

    await page.getByRole('link', { name: /世界一誠実な読み手/ }).click();
    await expect(page).toHaveURL(/\/courses\/kotoba\/01\/$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('誠実な読み手');

    // 前後ナビでレッスン2へ
    await page.getByRole('link', { name: /つぎ →/ }).click();
    await expect(page).toHaveURL(/\/courses\/kotoba\/02\/$/);
  });

  test('トップのヒーローでにわ語が実行できる', async ({ page }) => {
    await page.goto('');
    const runner = page.locator('.runner').first();
    await expect(runner.locator('.runner-run')).toBeEnabled();
    await runner.locator('.runner-run').click();
    // 描画が走るとプレースホルダ文言が消える
    await expect(runner.locator('.runner-canvas-empty')).toBeHidden();
  });
});
