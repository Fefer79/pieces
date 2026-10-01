import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F } from "../theme";
import { Eyebrow, Headline } from "../components/Kit";
import { Reveal } from "../components/Reveal";
import { DesktopFrame, PhoneFrame } from "../components/Frames";

const STATS = [
  ["20–30 %", "d'économie visée sur le budget pièces"],
  ["30 jours", "d'essai gratuit"],
];

export const Flotte: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Reveal delay={0} from="left" dist={120} dur={34} style={{ position: "absolute", left: 120, top: 150 }}>
      <DesktopFrame src="d-flotte.png" url="flotte.pieces.ci" width={900} />
    </Reveal>
    <Reveal delay={22} from="bottom" dist={140} dur={36} style={{ position: "absolute", left: 70, top: 560 }}>
      <PhoneFrame src="m-flotte.png" width={300} />
    </Reveal>
    <div style={{ position: "absolute", left: 1130, top: 170, width: 690 }}>
      <Reveal delay={8}>
        <Eyebrow accent>05 · Flotte</Eyebrow>
      </Reveal>
      <Reveal delay={16} style={{ marginTop: 28 }}>
        <Headline dark size={88}>Votre budget pièces cache des économies.</Headline>
      </Reveal>
      <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 56 }}>
        {STATS.map(([big, small], i) => (
          <Reveal key={big} delay={56 + i * 18}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
              <span style={{ fontFamily: F.mono, fontSize: 68, color: "#fff", whiteSpace: "nowrap", flexShrink: 0 }}>{big}</span>
              <span style={{ fontFamily: F.body, fontSize: 34, color: "rgba(255,255,255,0.72)" }}>{small}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  </AbsoluteFill>
);
