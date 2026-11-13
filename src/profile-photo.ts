// The tab icon and the profile photo use the same public image.
// Sharing this request avoids a second backend call on every page load.
const PROFILE_URL = "https://serazul-backend.vercel.app/api/public/profile";
let currentPhoto: Promise<string | null> | undefined;

export function getProfilePhoto(): Promise<string | null> {
  if (!currentPhoto) {
    currentPhoto = fetch(PROFILE_URL, {
      credentials: "omit",
      cache: "no-store"
    })
      .then(response => {
        if (!response.ok) throw new Error("Profile photo unavailable");
        return response.json();
      })
      .then(data =>
        typeof data?.url === "string" && /^https:\/\//.test(data.url)
          ? data.url as string
          : null
      )
      .catch(() => null);
  }
  return currentPhoto;
}

export async function updateTabIcon(): Promise<void> {
  const url = await getProfilePhoto();
  if (!url) return;
  const icon = document.querySelector<HTMLLinkElement>("link[data-profile-favicon]");
  if (icon) icon.href = url;
}
