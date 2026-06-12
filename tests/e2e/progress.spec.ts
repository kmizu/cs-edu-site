import { expect, test } from '@playwright/test';

test.describe('進捗の保存', () => {
  test('レッスン完了がリロード後も残り、庭に植わる', async ({ page }) => {
    await page.goto('courses/kotoba/01/');

    const complete = page.locator('.lesson-complete');
    await complete.scrollIntoViewIfNeeded();
    const button = complete.getByRole('button', { name: 'このレッスンを読み終えた' });
    await expect(button).toBeVisible();
    // client:visible の島がhydrateするまでクリックを粘る
    await expect(async () => {
      await button.click({ timeout: 1000 });
      await expect(complete).toContainText('植わりました', { timeout: 1000 });
    }).toPass({ timeout: 15_000 });

    await page.reload();
    await complete.scrollIntoViewIfNeeded();
    await expect(complete).toContainText('植わりました');

    // あなたの庭に反映される
    await page.goto('garden/');
    await expect(page.locator('.garden-course').first()).toContainText('1 / 10');

    // コース一覧でも植物が育つ
    await page.goto('courses/kotoba/');
    await expect(page.locator('[data-lesson-id="kotoba/01"]')).toHaveClass(/is-done/);
  });
});
