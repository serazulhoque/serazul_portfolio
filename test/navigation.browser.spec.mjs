import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { join } from "node:path";

// Run against the built GitHub Pages site, served using Vite preview.
test.use({ baseURL: "http://127.0.0.1:4173" });

for (const [mode, width, height] of [
  ["desktop", 1440, 900],
  ["compact desktop", 1100, 800]
]) {
  test(mode + ": navigate through all clean portfolio URLs", async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const nav = page.locator(".desktop-nav");
    await expect(nav).toBeVisible();

    for (const destination of ["/aboutme", "/blog", "/gallery", "/get-in-touch"]) {
      await nav.locator('a[href="' + destination + '"]').click();
      await expect(page).toHaveURL(new RegExp(destination + "/?$"));
      await expect(page.locator("#main")).toBeVisible();
      await nav.locator('a[href="/"]').click();
      await expect(page).toHaveURL(/\/$/);
    }
    await nav.locator('a[href="/"]').click();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
  });
}

for (const [mode, width, height] of [
  ["phone", 390, 844],
  ["small phone", 320, 700],
  ["tablet", 768, 1024]
]) {
  test(mode + ": mobile menu links open and close correctly", async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const menu = page.locator("#portfolio-menu");
    for (const route of ["/aboutme", "/blog", "/gallery", "/get-in-touch"]) {
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(menu).toHaveAttribute("open", "");
      await menu.locator('a[href="' + route + '"]').click();
      await expect(page).toHaveURL(new RegExp(route + "/?$"));
      await expect(page.locator("#main")).toBeVisible();

      // Same-route taps must close the dialog without leaving an overlay.
      await page.getByRole("button", { name: "Open menu" }).click();
      await menu.locator('a[href="' + route + '"]').click();
      await expect(menu).not.toHaveAttribute("open", "");

      await page.getByRole("button", { name: "Open menu" }).click();
      await menu.locator('a[href="/"]').last().click();
      await expect(page).toHaveURL(/\/$/);
      await expect(menu).not.toHaveAttribute("open", "");
    }
    await page.getByRole("button", { name: "Open menu" }).click();
    await menu.locator('a[href="/"]').last().click();
    await expect(menu).not.toHaveAttribute("open", "");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
  });
}

test("direct URLs serve prerendered HTML, old URLs still work, and contact email is updated", async ({ page }) => {
  await page.route("https://serazul-backend.vercel.app/api/public/settings", route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ contact_email: "hello@serazulh.com" })
    })
  );

  for (const route of ["/aboutme/", "/blog/", "/gallery/", "/get-in-touch/"]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator("#main")).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://serazulh.com" + route.slice(0, -1));
  }
  await expect(page.locator('a[href="mailto:hello@serazulh.com"]')).toBeVisible();

  for (const oldPath of ["about.html","gallery.html"]) {
    expect(existsSync(join(process.cwd(),"dist",oldPath))).toBe(false);
  }
});
