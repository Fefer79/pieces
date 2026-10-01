import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";
import { Bullet, Eyebrow, Headline } from "../components/Kit";
import { Reveal } from "../components/Reveal";
import { DesktopFrame, PhoneFrame } from "../components/Frames";
import { Chip } from "../components/Chip";

export const Logistique: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <div style={{ position: "absolute", left: 120, top: 150, width: 760 }}>
      <Reveal>
        <Eyebrow accent>04 · Logistique</Eyebrow>
      </Reveal>
      <Reveal delay={8} style={{ marginTop: 28 }}>
        <Headline dark size={92}>La pièce introuvable à Abidjan ? Nous la faisons venir.</Headline>
      </Reveal>
      <Reveal delay={34} style={{ marginTop: 40, display: "flex", gap: 14 }}>
        <Chip kind="import" size={28}>À importer</Chip>
        <Chip kind="neuf" size={28}>Neuf</Chip>
      </Reveal>
      <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 44 }}>
        <Reveal delay={56}>
          <Bullet dark>Fret, douane et livraison compris</Bullet>
        </Reveal>
        <Reveal delay={74}>
          <Bullet dark>Un seul interlocuteur, un seul montant</Bullet>
        </Reveal>
        <Reveal delay={92}>
          <Bullet dark>Acompte aujourd'hui, solde à l'arrivée</Bullet>
        </Reveal>
      </div>
    </div>
    <Reveal delay={14} from="right" dist={140} dur={34} style={{ position: "absolute", left: 930, top: 200 }}>
      <DesktopFrame src="d-logistique.png" url="logistique.pieces.ci" width={900} />
    </Reveal>
    <Reveal delay={40} from="bottom" dist={120} dur={36} style={{ position: "absolute", left: 1540, top: 690 }}>
      <PhoneFrame src="m-logistique.png" width={300} />
    </Reveal>
  </AbsoluteFill>
);
