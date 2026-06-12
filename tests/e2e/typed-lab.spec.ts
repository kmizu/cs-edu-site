import { expect, test } from '@playwright/test';

test.describe('型の目（コース6）', () => {
  test('型エラーを実行前に止め、直すと実行される', async ({ page }) => {
    await page.goto('courses/kata/03/');
    const lab = page.locator('.minilab:has(.minilab-typecheck)').first();
    await lab.scrollIntoViewIfNeeded();

    // 初期コード 1 + (2 == 3): 型の目が止める＝実行していない
    await expect(lab.locator('.minilab-typeerror')).toContainText('数が来るはず');
    await expect(lab.locator('.minilab-result .minilab-error')).toContainText('実行していません');

    // 直すと、検査が通って値が出る（hydration完了までリトライ）
    await expect(async () => {
      await lab.locator('textarea').fill('1 + 2');
      await expect(lab.locator('.minilab-types-ok')).toBeVisible({ timeout: 700 });
    }).toPass();
    await expect(lab.locator('.minilab-value').first()).toHaveText('3');
  });

  test('関数の型が推論されてチップに出る', async ({ page }) => {
    await page.goto('courses/kata/05/');
    const lab = page.locator('.minilab:has(.minilab-typecheck)').first();
    await lab.scrollIntoViewIfNeeded();

    // fn double(x: 数) → チップに「関数(数) → 数」
    await expect(lab.locator('.minilab-typebind').first()).toContainText('関数(数) → 数');
    await expect(lab.locator('.minilab-value').first()).toHaveText('42');
  });
});
