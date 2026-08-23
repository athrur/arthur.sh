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
    label: "INPUT",
    title: "Source footage",
    body: "The dataset contains 42 public videos and 5,463,775 frames, recorded across different wheels, lighting conditions, and camera angles.",
  },
  {
    key: "detect",
    label: "DETECT",
    title: "Object detection",
    body: "YOLOv11 segmentation identifies the ball, green zero, and croupier’s hand. Mean ball-centre error was 1.36 px.",
  },
  {
    key: "normalise",
    label: "NORMALISE",
    title: "Geometric normalisation",
    body: "An ellipse fit and homography map each camera view to a unit circle before smoothing and interpolation.",
  },
  {
    key: "trajectory",
    label: "TRAJECTORY",
    title: "Feature extraction",
    body: "The cleaned tracks become angles, radii, velocities, and a drop-off label for each spin.",
  },
] as const;

export const RESEARCH_CHAPTERS = [
  { number: "01", label: "VIDEO", detail: "42 source videos", href: "#dataset" },
  { number: "02", label: "LABELS", detail: "segmentation data", href: "#dataset" },
  { number: "03", label: "TRACK", detail: "ball and wheel", href: "#vision" },
  { number: "04", label: "NORMALISE", detail: "camera geometry", href: "#vision" },
  { number: "05", label: "PREDICT", detail: "three LSTM tasks", href: "#training" },
  { number: "06", label: "TEST", detail: "held-out results", href: "#results" },
] as const;

export const DATASET_PHASES = [
  {
    key: "acquire",
    label: "ACQUIRE",
    title: "Video collection",
    body: "With permission, 42 YouTube videos supplied 30 hours, 21 minutes, and 15 seconds of footage at 50 FPS.",
  },
  {
    key: "prepare",
    label: "PREPARE",
    title: "Frame preparation",
    body: "Videos were downloaded at 720p, stripped of overlays, cropped to the wheel, and resized to 640×640.",
  },
  {
    key: "annotate",
    label: "ANNOTATE",
    title: "Segmentation labels",
    body: "The ball, green zero, and croupier’s hand were labelled in 500 verified frames, then expanded with 3× augmentation.",
  },
  {
    key: "repair",
    label: "REPAIR",
    title: "Repair missing frames",
    body: "When the ball briefly disappeared behind the rim or a hand, its position was estimated from the previous 12 frames and then smoothed.",
  },
  {
    key: "split",
    label: "SPLIT",
    title: "Spin segmentation",
    body: "A rolling hand signal identified spins. Segments outside 15–45 seconds were removed before trajectory extraction.",
  },
  {
    key: "curate",
    label: "CURATE",
    title: "Quality filtering",
    body: "2,765 spins remained after filtering missing drop events, implausible radii, and discontinuities in angular position.",
  },
] as const;

export const TRAINING_PHASES = [
  {
    key: "split",
    label: "SPLIT",
    title: "Dataset split",
    body: "The 2,765 valid spins were split 75% / 12.5% / 12.5% for training, validation, and held-out testing.",
  },
  {
    key: "architect",
    label: "ARCHITECT",
    title: "Three prediction tasks",
    body: "One LSTM estimates drop-off time. Two encoder–decoders estimate the ball and wheel angular trajectories.",
  },
  {
    key: "optimise",
    label: "OPTIMISE",
    title: "Training procedure",
    body: "Adam, circular loss, learning-rate scheduling, and ten-epoch early stopping were used for the variable-length sequences.",
  },
  {
    key: "challenge",
    label: "ABLATE",
    title: "Ablation tests",
    body: "Feature removal, Gaussian noise, and reduced datasets were tested across five observation windows.",
  },
] as const;
