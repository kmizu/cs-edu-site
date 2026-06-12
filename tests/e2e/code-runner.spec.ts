import { expect, test } from '@playwright/test';

test.describe('あそびば（コード実行）', () => {
  test('にわ語のエラーが誠実な日本語で返る', async ({ page }) => {
    await page.goto('playground/');
    const runner = page.locator('.runner[data-lang="niwa"]');
    await expect(runner.locator('.runner-run')).toBeEnabled();

    await runner.locator('.cm-content').fill('はな を かく');
    await runner.locator('.runner-run').click();
    await expect(runner.locator('.runner-error-message')).toContainText('はな');
  });

  test('JavaScriptの実行とconsole出力', async ({ page }) => {
    await page.goto('playground/');
    await page.getByRole('tab', { name: 'JavaScript' }).click();

    const runner = page.locator('.runner[data-lang="js"]');
    await expect(runner.locator('.runner-run')).toBeEnabled();
    await runner.locator('.cm-content').fill('console.log("niwa-e2e-ok")');
    await runner.locator('.runner-run').click();
    await expect(runner.locator('.runner-output')).toContainText('niwa-e2e-ok');
  });

  test('無限ループはタイムアウトで止まり、通知が出る', async ({ page }) => {
    await page.goto('playground/');
    await page.getByRole('tab', { name: 'JavaScript' }).click();

    const runner = page.locator('.runner[data-lang="js"]');
    await expect(runner.locator('.runner-run')).toBeEnabled();
    await runner.locator('.cm-content').fill('while (true) {}');
    await runner.locator('.runner-run').click();
    await expect(runner.locator('.runner-error-message')).toContainText('止めました', {
      timeout: 10_000,
    });

    // 殺したWorkerが作り直され、次の実行が普通に動くこと
    await expect(runner.locator('.runner-run')).toBeEnabled();
    await runner.locator('.cm-content').fill('console.log("alive-again")');
    await runner.locator('.runner-run').click();
    await expect(runner.locator('.runner-output')).toContainText('alive-again', {
      timeout: 15_000,
    });
  });
});
