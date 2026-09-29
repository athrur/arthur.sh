import type { Metadata } from "next";
import { ContactFooter } from "@/components/contact-footer";
import { DatasetStory } from "@/components/roulette/dataset-story";
import { RouletteHeader } from "@/components/roulette/roulette-header";
import { RouletteHero } from "@/components/roulette/roulette-hero";
import { RouletteScrollMode } from "@/components/roulette/roulette-scroll-mode";
import { SpinLab } from "@/components/roulette/spin-lab";
import { TrainingStory } from "@/components/roulette/training-story";
import { PipelineStory } from "@/components/pipeline-story";
import { ResultsExplorer } from "@/components/results-explorer";

export const metadata: Metadata = {
  title: "Predicting Roulette — Arthur Robertson",
  description: "From 5.46 million video frames to three neural networks: tracking roulette motion and forecasting what comes next.",
  alternates: { canonical: "/work/predicting-roulette" },
};

export default function PredictingRoulettePage() {
  return (
    <>
      <RouletteScrollMode />
      <RouletteHeader />
      <main className="roulette-case" id="top">
        <RouletteHero />
        <DatasetStory />
        <PipelineStory />
        <SpinLab />
        <TrainingStory />
        <ResultsExplorer />
      </main>
      <ContactFooter />
    </>
  );
}
