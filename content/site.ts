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
      "How much of a roulette spin can you predict from video?",
    description:
      "I built a dataset from 40 hours of roulette footage, then trained neural networks to predict the ball’s motion, the wheel’s rotation, and the moment the ball drops.",
    pdf: "/ArthurRobertson.pdf",
    metrics: [
      { value: "5.46M", label: "frames" },
      { value: "2,765", label: "valid spins" },
      { value: "0.52s", label: "timing MAE" },
    ],
  },
} as const;
