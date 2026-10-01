import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, F, enter } from "../theme";
import { Eyebrow, Logo } from "../components/Kit";
import { Reveal } from "../components/Reveal";

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const logoScale = interpolate(frame, [0, 30], [0.92, 1], { extrapolateRight: "clamp", easing: enter });
  return (
    <AbsoluteFill style={{ background: C.ink, alignItems: "center", justifyContent: "center", gap: 36, flexDirection: "column" }}>
      <Reveal dur={26} dist={20}>
        <div style={{ scale: String(logoScale) }}>
          <Logo size={260} dark />
        </div>
      </Reveal>
      <Reveal delay={26}>
        <Eyebrow accent>Marketplace de pièces auto · Abidjan</Eyebrow>
      </Reveal>
      <Reveal delay={46}>
        <div style={{ fontFamily: F.body, fontSize: 56, color: "rgba(255,255,255,0.88)", fontWeight: 500 }}>
          La bonne pièce. Au juste prix.
        </div>
      </Reveal>
    </AbsoluteFill>
  );
};
