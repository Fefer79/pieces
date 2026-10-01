import React from "react";
import { AbsoluteFill } from "remotion";
import { C, F } from "../theme";
import { Logo } from "../components/Kit";
import { Reveal } from "../components/Reveal";

const SPACES = [
  ["Marketplace", "pieces.ci"],
  ["Garages", "mecanicien.pieces.ci"],
  ["Flotte", "flotte.pieces.ci"],
  ["Logistique", "logistique.pieces.ci"],
];

export const Outro: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink, alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 44 }}>
    <Reveal dur={26} dist={20}>
      <Logo size={200} dark />
    </Reveal>
    <Reveal delay={18}>
      <div style={{ fontFamily: F.display, fontSize: 70, color: "#fff", textAlign: "center" }}>Le juste prix, sans intermédiaires.</div>
    </Reveal>
    <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
      {SPACES.map(([name, url], i) => (
        <Reveal key={name} delay={40 + i * 10} dist={20}>
          <div style={{ border: "1.5px solid rgba(255,255,255,0.22)", borderRadius: 16, padding: "20px 30px", minWidth: 330 }}>
            <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 34, color: "#fff" }}>{name}</div>
            <div style={{ fontFamily: F.mono, fontSize: 23, color: "rgba(255,255,255,0.62)", marginTop: 6 }}>{url}</div>
          </div>
        </Reveal>
      ))}
    </div>
    <Reveal delay={86}>
      <div style={{ fontFamily: F.body, fontWeight: 600, fontSize: 40, color: "#fff", background: C.accent, padding: "22px 54px", borderRadius: 14 }}>
        pieces.ci · (225) 07 06 84 62 68
      </div>
    </Reveal>
  </AbsoluteFill>
);
