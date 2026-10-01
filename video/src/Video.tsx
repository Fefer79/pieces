import React from "react";
import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Hook } from "./scenes/Hook";
import { Promesse } from "./scenes/Promesse";
import { Marketplace } from "./scenes/Marketplace";
import { Transparence } from "./scenes/Transparence";
import { Garages } from "./scenes/Garages";
import { Logistique } from "./scenes/Logistique";
import { Flotte } from "./scenes/Flotte";
import { Outro } from "./scenes/Outro";

const T = 15;
const timing = linearTiming({ durationInFrames: T });

// 8 scènes, 7 transitions de 15 images → 1 395 images = 46,5 s à 30 fps
export const PiecesVideo: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={120} name="Hook"><Hook /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={timing} />
    <TransitionSeries.Sequence durationInFrames={120} name="Promesse"><Promesse /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />
    <TransitionSeries.Sequence durationInFrames={240} name="Marketplace"><Marketplace /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />
    <TransitionSeries.Sequence durationInFrames={240} name="Transparence"><Transparence /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />
    <TransitionSeries.Sequence durationInFrames={210} name="Garages"><Garages /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={timing} />
    <TransitionSeries.Sequence durationInFrames={210} name="Logistique"><Logistique /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={timing} />
    <TransitionSeries.Sequence durationInFrames={210} name="Flotte"><Flotte /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={fade()} timing={timing} />
    <TransitionSeries.Sequence durationInFrames={150} name="Outro"><Outro /></TransitionSeries.Sequence>
  </TransitionSeries>
);
