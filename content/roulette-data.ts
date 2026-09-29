export const HORIZONS = [100, 200, 300, 400, 500] as const;

export type Horizon = (typeof HORIZONS)[number];
export type InputCondition = "full" | "noise" | "no-angular";
export type Comparison = "lstm" | "last-angle" | "random";

export type HorizonResult = {
  seconds: number;
  timingMae: number;
  ballMae: number;
  ballDropError: number;
  wheelMae: number;
};

export const HORIZON_RESULTS: Record<Horizon, HorizonResult> = {
  100: { seconds: 2, timingMae: 59.19, ballMae: 0.845, ballDropError: 1.17, wheelMae: 0.108 },
  200: { seconds: 4, timingMae: 44.88, ballMae: 0.349, ballDropError: 0.742, wheelMae: 0.039 },
  300: { seconds: 6, timingMae: 37.05, ballMae: 0.185, ballDropError: 0.33, wheelMae: 0.034 },
  400: { seconds: 8, timingMae: 29.82, ballMae: 0.124, ballDropError: 0.229, wheelMae: 0.033 },
  500: { seconds: 10, timingMae: 25.94, ballMae: 0.117, ballDropError: 0.215, wheelMae: 0.025 },
};

export const CONDITION_RESULTS: Record<InputCondition, { label: string; ballMae: number; ballDropError: number }> = {
  full: { label: "Full model", ballMae: 0.185, ballDropError: 0.33 },
  noise: { label: "Gaussian noise σ=0.05", ballMae: 0.314, ballDropError: 0.556 },
  "no-angular": { label: "No derived angular features", ballMae: 1.179, ballDropError: 1.284 },
};

export const COMPARISON_RESULTS: Record<Comparison, { label: string; ballMae: number; ballDropError: number }> = {
  lstm: { label: "LSTM", ballMae: 0.185, ballDropError: 0.33 },
  "last-angle": { label: "Last-angle", ballMae: 1.565, ballDropError: 1.54 },
  random: { label: "Random", ballMae: 1.572, ballDropError: 1.663 },
};

export const PIPELINE_STAGES = [
  {
    key: "input",
    label: "Video",
    title: "Starting with the camera’s view",
    body: "I started with 42 videos: over 5.46 million frames across different wheels, lighting conditions, and camera angles.",
  },
  {
    key: "detect",
    label: "Detect",
    title: "Locating the ball and wheel",
    body: "I trained a YOLOv11 segmentation model to find the ball, green zero, and dealer’s hand. It located the ball’s centre with a mean error of 1.36 pixels.",
  },
  {
    key: "normalise",
    label: "Correct",
    title: "Removing the camera angle",
    body: "I fitted an ellipse to the track, then transformed the angled camera view into a top-down circle. That gave every spin a shared coordinate system.",
  },
  {
    key: "trajectory",
    label: "Measure",
    title: "Turning positions into motion",
    body: "From those tracks, I calculated position and speed, then identified when the ball left the rim. Those measurements became the models’ training data.",
  },
] as const;

export const RESEARCH_CHAPTERS = [
  { number: "01", label: "VIDEO", detail: "42 source videos", href: "#dataset" },
  { number: "02", label: "LABELS", detail: "segmentation data", href: "#dataset" },
  { number: "03", label: "TRACK", detail: "ball and wheel", href: "#vision" },
  { number: "04", label: "Correct", detail: "camera geometry", href: "#vision" },
  { number: "05", label: "PREDICT", detail: "three LSTM tasks", href: "#training" },
  { number: "06", label: "TEST", detail: "held-out results", href: "#results" },
] as const;

export const TRAINING_PHASES = [
  {
    key: "split",
    label: "Split",
    title: "Keeping the final test separate",
    body: "I used 75% of the spins for training, 12.5% to tune the models, and reserved the final 12.5% for testing.",
  },
  {
    key: "architect",
    label: "Design",
    title: "A separate model for each question",
    body: "One LSTM predicts a single drop time. Two encoder–decoder networks predict sequences of future angles, one for the ball and one for the wheel.",
  },
  {
    key: "optimise",
    label: "Train",
    title: "Training without overfitting the examples",
    body: "I trained with Adam and a loss suited to circular motion, reducing the learning rate as progress slowed and stopping after ten epochs without improvement.",
  },
  {
    key: "challenge",
    label: "Test",
    title: "Checking what the models depended on",
    body: "I removed features, added noise, and reduced the training set to test how robust the models were. I also varied the observation window from two to ten seconds to measure how much early footage helped.",
  },
] as const;
