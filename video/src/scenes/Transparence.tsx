import React from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";
import { Eyebrow, Headline, Sub } from "../components/Kit";
import { Reveal } from "../components/Reveal";
import { DesktopFrame } from "../components/Frames";
import { Chip } from "../components/Chip";
import { Receipt } from "../components/Receipt";

export const Transparence: React.FC = () => (
  <AbsoluteFill style={{ background: C.surface }}>
    <div style={{ position: "absolute", left: 120, top: 150, width: 800 }}>
      <Reveal>
        <Eyebrow>02 · Transparence</Eyebrow>
      </Reveal>
      <Reveal delay={8} style={{ marginTop: 28 }}>
        <Headline size={96}>Chaque prix détaillé. Chaque état visible.</Headline>
      </Reveal>
      <Reveal delay={30} style={{ marginTop: 36 }}>
        <Sub>Fin des marges cachées : vous voyez ce que vous payez.</Sub>
      </Reveal>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 52, maxWidth: 780 }}>
        {(
          [
            ["neuf", "Neuf"],
            ["occasion", "Occasion importée"],
            ["reusine", "Ré-usiné"],
            ["aftermarket", "Aftermarket"],
            ["oem", "OEM"],
          ] as const
        ).map(([k, t], i) => (
          <Reveal key={k} delay={50 + i * 9} dist={18}>
            <Chip kind={k} size={28}>
              {t}
            </Chip>
          </Reveal>
        ))}
      </div>
    </div>
    <Reveal delay={14} from="right" dist={140} dur={34} style={{ position: "absolute", left: 960, top: 150 }}>
      <DesktopFrame src="d-produit.png" url="pieces.ci/produit" width={880} />
    </Reveal>
    <Reveal delay={56} from="bottom" dist={90} dur={30} style={{ position: "absolute", left: 1160, top: 360 }}>
      <Receipt
        eyebrow="Exemple · détail du prix"
        title="Votre commande"
        width={640}
        delay={64}
        totalLabel="Total"
        seal="Paiement sous séquestre. Aucune marge cachée."
        lines={[
          { label: "Prix vendeur", value: 65000 },
          { label: "Main-d'œuvre", value: 15000 },
          { label: "Livraison (Cocody)", value: 3500 },
          { label: "Frais plateforme", value: 5040 },
        ]}
      />
    </Reveal>
  </AbsoluteFill>
);
