import { test, expect } from "@playwright/test";

// Run against the built GitHub Pages site served by Vite preview.
test.use({ baseURL: "http://127.0.0.1:4173" });

for (const [mode, width, height] of [
  ["desktop", 1440, 900],
  ["compact desktop", 1100, 800],
]) {
  test(`${mode}: Home, About, Blog, Gallery and contact links work`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const navigation = page.locator(".desktop-nav");
    await expect(navigation).toBeVisible();

    await navigation.locator('a[href="/about.html"]').click();
    await expect(page).toHaveURL(/\/about\.html$/);
    await page.locator(".desktop-nav a[href='/']").click();
    await expect(page).toHaveURL(/\/$/);

    await page.locator(".desktop-nav a[href='/blog']").click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await page.locator(".desktop-nav a[href='/']").click();
    await expect(page).toHaveURL(/\/$/);

    await page.locator(".desktop-nav a[href='/gallery.html']").click();
    await expect(page).toHaveURL(/\/gallery\.html$/);
    await page.locator(".desktop-nav a[href='/']").click();
    await expect(page).toHaveURL(/\/$/);

    await page.locator(".desktop-nav a[href='#contact']").click();
    await expect(page).toHaveURL(/\/#contact$/);
    await expect(page.locator("#contact")).toBeInViewport();
    await page.locator(".desktop-nav a[href='/']").click();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
  });
}

for (const [mode, width, height] of [
  ["phone", 390, 844],
  ["small phone", 320, 700],
  ["tablet", 768, 1024],
]) {
  test(`${mode}: mobile menu opens, navigates, closes and returns Home`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const open = page.getByRole("button", { name: "Open menu" });
    const menu = page.locator("#portfolio-menu");
    await expect(open).toBeVisible();
    await expect(open).toBeEnabled();

    await open.click();
    await expect(menu).toHaveAttribute("open", "");
    await menu.locator('a[href="/about.html"]').click();
    await expect(page).toHaveURL(/\/about\.html$/);

    await page.getByRole("button", { name: "Open menu" }).click();
    await menu.locator('a[href="/"]').last().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(menu).not.toHaveAttribute("open", "");

    await page.getByRole("button", { name: "Open menu" }).click();
    await menu.locator('a[href="#contact"]').click();
    await expect(page).toHaveURL(/\/#contact$/);
    await expect(menu).not.toHaveAttribute("open", "");
    await expect(page.locator("#contact")).toBeInViewport();

    // Clicking HOME on the homepage must close the dialog and go to the top,
    // even though the browser is already on the same document.
    await page.getByRole("button", { name: "Open menu" }).click();
    await menu.locator('a[href="/"]').last().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(menu).not.toHaveAttribute("open", "");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);

    await page.getByRole("button", { name: "Open menu" }).click();
    await menu.locator('a[href="/blog"]').click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await page.getByRole("button", { name: "Open menu" }).click();
    await menu.locator('a[href="/"]').last().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(menu).not.toHaveAttribute("open", "");
  });
}
