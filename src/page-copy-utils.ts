
type PageSections = {
  hero_line_one: string;
  hero_line_two: string;
  hero_phrase: string;
  hero_emphasis: string;
  hero_intro: string;
  about_line_one: string;
  about_line_two: string;
  about_paragraph_one: string;
  about_paragraph_two: string;
  contact_heading: string;
  contact_paragraph: string;
};
const DEFAULT_PAGE_SECTIONS: PageSections = {
  hero_line_one: "Engineering",
  hero_line_two: "Student",
  hero_phrase: "with a",
  hero_emphasis: "Purpose",
  hero_intro:
    "Hi, I’m Serazul Hoque, studying Bachelor of Science in Software Engineering at Istanbul Sabahattin Zaim University.",
  about_line_one: "Learning the craft.",
  about_line_two: "Keeping people in mind.",
  about_paragraph_one:
    "I’m pursuing software engineering because I want to turn ideas into things people can use. Right now, that means learning the foundations, asking questions, and connecting the small steps to a bigger goal.",
  about_paragraph_two:
    "One idea keeps me curious: an AI people can talk to in Rohingya. It brings together my interest in technology and a language that matters to me. This is where I’m beginning.",
  contact_heading: "Let’s Connect.",
  contact_paragraph:
    "Have a question, idea, or something you’d like to discuss with me? I’d love to get back to you...",
};

// A cache is useful only when it contains a complete, valid page copy.
export function parsePageCopy(value: unknown): PageSections | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const result = { ...DEFAULT_PAGE_SECTIONS };
  for (const key of Object.keys(result) as Array<keyof PageSections>) {
    const text = data[key];
    const maximum =
      key.includes("paragraph") || key === "hero_intro" ? 2500 : 160;
    if (typeof text !== "string" || !text.trim() || text.length > maximum)
      return null;
    result[key] = text;
  }
  return result;
}

