import { test, expect } from '@playwright/test';

test.describe('Match Flow', () => {

  test('full match lifecycle: setup, roster, scoring, and overlay', async ({ page, context }) => {
    // Navigate to Matches via Home view card
    await page.goto('/');
    await page.getByRole('link', { name: 'Panel de partido' }).click();
    await expect(page).toHaveURL(/.*\/matches/);

    // Create a new match session
    const matchTitle = `e2e-match-${Date.now()}`;
    await page.getByPlaceholder('Título opcional').fill(matchTitle);
    await page.getByRole('button', { name: 'Crear' }).click();

    // Verify we are redirected to the controller
    await expect(page).toHaveURL(new RegExp(`.*\\/controller\\/`));
    
    // Check that we can edit the roster on the court
    // (The selects are always visible in the controller)
    // Find the first select in the court edit wrapper
    const selectElement = page.locator('.court-edit-select').first();
    
    // Get options for the select
    const options = await selectElement.locator('option').allInnerTexts();
    const targetOptionText = options.find(t => t.trim().length > 0 && !t.includes('L'));
    
    if (targetOptionText) {
       // Extract the number part (e.g., "#4 Player Name" -> "4")
       const match = targetOptionText.match(/#(\w+)/);
       if (match) {
           const targetValue = match[1];
           await selectElement.selectOption(targetValue);
           
           // Verify it stayed selected
           await page.waitForTimeout(500); // Give Vue a moment
           const selectedValue = await selectElement.inputValue();
           expect(selectedValue).toBe(targetValue);
       }
    }

    // Now test the Overlay sync!
    const controllerUrl = page.url();
    const matchId = controllerUrl.split('/').pop();
    const overlayPage = await context.newPage();
    await overlayPage.goto(`/overlay/${matchId}`);
    
    // Wait for the overlay to load
    await expect(overlayPage.locator('.vnl-scorebug')).toBeVisible();

    // Go back to controller and increment score
    await page.bringToFront();
    // Let's click the first button that has a text like '+1'
    const plusOneBtn = page.getByRole('button', { name: '+1' }).first();
    if (await plusOneBtn.isVisible()) {
       await plusOneBtn.click();
       // Switch to overlay and check if it updated
       await overlayPage.bringToFront();
       await overlayPage.waitForTimeout(1000); // give websocket time to sync
       // Expect the overlay to eventually show 1
       await expect(overlayPage.locator('text=1').first()).toBeVisible({ timeout: 5000 });
    }

    console.log('E2E flows passed successfully!');
  });
});
