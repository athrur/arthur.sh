export const site = {
  name: "Arthur Robertson",
  domain: "arthur.sh",
  role: "Software Engineer",
  description: "I make software.",
  links: {
    github: "https://github.com/athrur",
    linkedin: "https://linkedin.com/in/arthur-robertson/",
  },
  project: {
    title: "Predicting Roulette",
    question:
      "A small project about tracking motion in roulette footage.",
    description:
      "Video becomes tracked motion, then a model estimates what happens next—up to the point where the ball drops.",
    pdf: "/ArthurRobertson.pdf",
    metrics: [
      { value: "5.46M", label: "frames" },
      { value: "2,765", label: "valid spins" },
      { value: "0.51s", label: "timing MAE" },
    ],
  },
} as const;
