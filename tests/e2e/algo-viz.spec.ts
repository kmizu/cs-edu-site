import { expect, test } from '@playwright/test';

test.describe('手順の実験室（コース4）', () => {
  test('1歩すすむと場面とくらべた回数が進む', async ({ page }) => {
    await page.goto('courses/katachi/02/');
    const viz = page.locator('.algoviz').first();
    await viz.scrollIntoViewIfNeeded();

    // 初期状態: 1場面目、くらべた回数0
    await expect(viz.locator('.algoviz-progress')).toContainText('1 /');

    // 1歩すすむ（hydration完了までリトライ）
    await expect(async () => {
      await viz.getByRole('button', { name: '1歩すすむ' }).click();
      await expect(viz.locator('.algoviz-progress')).not.toContainText('1 /', { timeout: 700 });
    }).toPass();

    // くらべている場所が光る
    await expect(viz.locator('.algoviz-cell.is-compare').first()).toBeVisible();
  });

  test('並走対決で2つの盤面が同時に動く', async ({ page }) => {
    await page.goto('courses/katachi/03/');
    const race = page
      .locator('.algoviz')
      .filter({ hasText: 'まっすぐさがす' })
      .filter({ hasText: '半分に切ってさがす' })
      .first();
    await race.scrollIntoViewIfNeeded();
    await expect(race.locator('.algoviz-board')).toHaveCount(2);

    // 再生して、決着まで待つ（まっすぐ10回 vs 半分切り4回）
    await expect(async () => {
      await race.getByRole('button', { name: '再生する' }).click();
      await expect(race.locator('.algoviz-board.is-finished')).toHaveCount(2, { timeout: 15000 });
    }).toPass({ timeout: 30000 });

    // 探索の決着セルが光っている
    await expect(race.locator('.algoviz-cell.is-found').first()).toBeVisible();
  });
});
