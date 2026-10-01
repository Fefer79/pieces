import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";
import { Bullet, Eyebrow, Headline } from "../components/Kit";
import { Reveal } from "../components/Reveal";
import { DesktopFrame, PhoneFrame } from "../components/Frames";

export const Garages: React.FC = () => (
  <AbsoluteFill style={{ background: C.surface }}>
    <Reveal delay={0} from="left" dist={120} dur={34} style={{ position: "absolute", left: 120, top: 150 }}>
      <DesktopFrame src="d-garages.png" url="pieces.ci/mecaniciens" width={860} />
    </Reveal>
    <Reveal delay={18} from="bottom" dist={140} dur={36} style={{ position: "absolute", left: 640, top: 330 }}>
      <PhoneFrame src="m-garages.png" width={360} />
    </Reveal>
    <div style={{ position: "absolute", left: 1120, top: 190, width: 700 }}>
      <Reveal delay={10}>
        <Eyebrow>03 · Garages</Eyebrow>
      </Reveal>
      <Reveal delay={18} style={{ marginTop: 28 }}>
        <Headline size={92}>Un mécanicien de confiance, près de chez vous.</Headline>
      </Reveal>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 52 }}>
        <Reveal delay={54}>
          <Bullet>Carte des ateliers et avis clients</Bullet>
        </Reveal>
        <Reveal delay={72}>
          <Bullet>Prix des pièces et main-d'œuvre séparés</Bullet>
        </Reveal>
        <Reveal delay={90}>
          <Bullet>Ajoutez votre garage gratuitement</Bullet>
        </Reveal>
      </div>
    </div>
  </AbsoluteFill>
);
