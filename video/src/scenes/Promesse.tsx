import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, F, enter } from "../theme";
import { Eyebrow, Headline } from "../components/Kit";
import { Reveal } from "../components/Reveal";
import { DesktopFrame } from "../components/Frames";

const OLD = ["Marges cachées", "Prix flous", "Intermédiaires"];

export const Promesse: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: C.surface }}>
      <div style={{ position: "absolute", left: 120, top: 150, width: 860 }}>
        <Reveal>
          <Eyebrow>Le problème</Eyebrow>
        </Reveal>
        <div style={{ display: "flex", gap: 16, marginTop: 34, flexWrap: "wrap" }}>
          {OLD.map((t, i) => {
            const strike = interpolate(frame, [18 + i * 12, 32 + i * 12], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: enter });
            return (
              <Reveal key={t} delay={i * 8} dist={16}>
                <div style={{ position: "relative", fontFamily: F.mono, fontSize: 28, letterSpacing: "0.06em", textTransform: "uppercase", color: C.errorFg, background: C.errorBg, padding: "12px 22px", borderRadius: 9999 }}>
                  {t}
                  <div style={{ position: "absolute", left: 14, top: "50%", height: 3, width: `calc(${strike}% - 28px)`, background: C.errorFg }} />
                </div>
              </Reveal>
            );
          })}
        </div>
        <Reveal delay={58} style={{ marginTop: 56 }}>
          <Headline size={112}>
            Le juste prix des pièces, <span style={{ color: C.ink2 }}>sans intermédiaires.</span>
          </Headline>
        </Reveal>
      </div>
      <Reveal delay={40} from="right" dist={160} dur={34} style={{ position: "absolute", left: 990, top: 230 }}>
        <DesktopFrame src="d-browse.png" url="pieces.ci/browse" width={940} originY="30%" />
      </Reveal>
    </AbsoluteFill>
  );
};
