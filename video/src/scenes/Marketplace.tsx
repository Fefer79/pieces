import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";
import { Bullet, Eyebrow, Headline } from "../components/Kit";
import { Reveal } from "../components/Reveal";
import { DesktopFrame, PhoneFrame } from "../components/Frames";

export const Marketplace: React.FC = () => (
  <AbsoluteFill style={{ background: C.surface }}>
    <div style={{ position: "absolute", left: 120, top: 150, width: 760 }}>
      <Reveal>
        <Eyebrow>01 · Marketplace</Eyebrow>
      </Reveal>
      <Reveal delay={8} style={{ marginTop: 28 }}>
        <Headline size={96}>Trouvez la pièce exacte pour votre véhicule.</Headline>
      </Reveal>
      <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 56 }}>
        <Reveal delay={44}>
          <Bullet>Identifiez votre véhicule : marque, VIN ou WhatsApp</Bullet>
        </Reveal>
        <Reveal delay={62}>
          <Bullet>Cherchez par nom, référence OEM ou photo</Bullet>
        </Reveal>
        <Reveal delay={80}>
          <Bullet>Neuf, occasion, ré-usiné : plusieurs vendeurs</Bullet>
        </Reveal>
      </div>
    </div>
    <Reveal delay={20} from="right" dist={140} dur={34} style={{ position: "absolute", left: 940, top: 170 }}>
      <DesktopFrame src="d-search.png" url="pieces.ci/search" width={900} />
    </Reveal>
    <Reveal delay={50} from="bottom" dist={120} dur={36} style={{ position: "absolute", left: 1440, top: 400 }}>
      <PhoneFrame src="m-browse.png" width={340} />
    </Reveal>
  </AbsoluteFill>
);
