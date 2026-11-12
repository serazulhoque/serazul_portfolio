import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
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

test("direct URLs serve prerendered HTML, old HTML output is removed, and contact email is updated", async ({ page }) => {
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
  await page.getByRole("button",{name:"SEND TO ME"}).click();
  await expect(page.locator('a[href="mailto:hello@serazulh.com"]')).toBeVisible();

  for (const oldPath of ["about.html","gallery.html"]) {
    expect(existsSync(join(process.cwd(),"dist",oldPath))).toBe(false);
  }
});

test("dashboard entry redirects to the existing authenticated Vercel login", async () => {
  const html = readFileSync(join(process.cwd(), "dist", "hoquepapamama", "index.html"), "utf8");
  const destination = "https://serazul-admin-serazulhoque.vercel.app/admin.html?entry=portfolio";
  expect(html).toContain('http-equiv="refresh"');
  expect(html).toContain(destination);
  expect(html).toContain('rel="noreferrer"');
  expect(html).not.toContain("hoque15062002");
});


for (const [mode, width, height] of [
  ["desktop", 1440, 900],
  ["mobile", 390, 844],
  ["small phone", 320, 700]
]) {
  test(mode + ": complete About Me replaces the homepage introduction", async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const main = page.locator("#main");
    await expect(main.locator(":scope > .home-about-content")).toBeVisible();
    const start = main.locator(":scope > :first-child");
    await expect(start).toHaveClass(/home-about-content/);
    await expect(start.locator(".about-section")).toBeVisible();
    await expect(start.locator(".about-main h1")).toBeVisible();
    await expect(start.locator('[data-edit-key="about_paragraph_one"]')).not.toBeEmpty();
    await expect(start.locator('[data-edit-key="about_paragraph_two"]')).not.toBeEmpty();
    await expect(start.locator(".home-about-portrait .hero-photo")).toBeVisible();
    await expect(start.locator("#education")).toHaveCount(1);
    await expect(start.locator("#experience")).toHaveCount(1);
    await expect(main.locator(".hero, .hero-intro, .intro-strip")).toHaveCount(0);
    await expect(main.locator("#experience")).toHaveCount(1);
    await expect(main.locator(".customizable-home-layout")).toBeVisible();
    if (width <= 390) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
    const homeAbout = await start.locator(".about-main").innerText();
    await page.goto("/aboutme/");
    await expect(page.locator(".about-main h2")).toBeVisible();
    expect(await page.locator(".about-main").innerText()).toBe(homeAbout);
    if (width <= 390) {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    }
  });
}


test("contact page has two side-by-side choices and submits the form to the email service", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/get-in-touch/");
  const first=page.getByRole("button",{name:"SEND TO ME"});
  const second=page.getByRole("link",{name:"Leave a Thought"});
  await expect(first).toBeVisible();
  await expect(second).toBeVisible();
  const a=await first.boundingBox();
  const b=await second.boundingBox();
  expect(a).not.toBeNull();
  expect(b).not.toBeNull();
  expect(Math.abs(a.y-b.y)).toBeLessThan(5);
  await first.click();
  await expect(page.locator("#contact-mail-panel")).toBeVisible();
  await page.getByLabel("Your name").fill("Example Visitor");
  await page.getByLabel("Your email").fill("example@example.com");
  await page.getByLabel("Subject").fill("Project enquiry");
  await page.getByLabel("Message").fill("Hello, this is a test message.");
  let received=false;
  await page.route("https://formsubmit.co/ajax/hello@serazulh.com",async route=>{
    const body=route.request().postDataJSON();
    expect(body).toMatchObject({
      name:"Example Visitor",email:"example@example.com",
      subject:"Project enquiry",message:"Hello, this is a test message."
    });
    received=true;
    await route.fulfill({status:200,contentType:"application/json",body:'{"success":true}'});
  });
  await page.getByRole("button",{name:"Send message"}).click();
  await expect(page.getByRole("status")).toContainText("submitted for email delivery");
  expect(received).toBe(true);
  await second.click();
  await expect(page).toHaveURL(/\/#visitor-compose$/);
  await expect(page.locator("#visitor-compose")).toBeVisible();
  await expect(page.getByLabel("Your display name")).toBeVisible();
});

test("homepage contact choices use the same visitor note and mail form",async ({page})=>{
  await page.goto("/");
  const contact=page.locator("#contact");
  await expect(contact.getByRole("button",{name:"SEND TO ME"})).toBeVisible();
  await expect(contact.getByRole("link",{name:"Leave a Thought"}))
    .toHaveAttribute("href","/#visitor-compose");
  await contact.getByRole("button",{name:"SEND TO ME"}).click();
  await expect(contact.locator("#contact-mail-panel")).toBeVisible();
});

test("email form reports delivery-service failure without claiming success",async ({page})=>{
  await page.goto("/get-in-touch/");
  await page.route("https://formsubmit.co/ajax/hello@serazulh.com",route =>
    route.fulfill({status:503,contentType:"application/json",body:'{"success":false}'})
  );
  await page.getByRole("button",{name:"SEND TO ME"}).click();
  await page.getByLabel("Your name").fill("Example Visitor");
  await page.getByLabel("Your email").fill("example@example.com");
  await page.getByLabel("Subject").fill("Hello");
  await page.getByLabel("Message").fill("A note for testing.");
  await page.getByRole("button",{name:"Send message"}).click();
  await expect(page.locator(".contact-mail-feedback")).toContainText("could not submit");
  await expect(page.getByLabel("Message")).toHaveValue("A note for testing.");
});
