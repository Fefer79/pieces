<p class="eyebrow">Cahier de production — prompts prêts à coller</p>

# Prompts Seedance 2.0 — les 14 films de la campagne

<p class="deck">Cahier de production pour seevio.ai. Références à charger, réglages, et prompt complet plan par plan pour les trois campagnes : grand public, VTC, logistique.pieces.ci.</p>

<div class="callout">
<p class="lead">Ce document se lit <strong>en produisant</strong>, pas en réunion.</p>
<p>Chaque bloc encadré se colle tel quel dans seevio. Le stratégique est dans « Campagne vidéo humour — Facebook & TikTok » ; ici, il n'y a que de l'exécution.</p>
</div>

## 1. Ce que Seedance 2.0 attend

Le modèle récompense la **direction claire**, pas la formule habile. Structure officielle du prompt : **Sujet** et **Mouvement** sont obligatoires — qui fait quoi ; **Environnement**, **Esthétique**, **Caméra** et **Audio** sont optionnels mais décident du résultat.

### Référencement des fichiers

Les fichiers chargés se citent **en langage naturel dans l'ordre de chargement** : `Image 1`, `Image 2`, … `Video 1`, … C'est la syntaxe documentée par seevio. Les notations à arobase (`@Character1`) vues sur des blogs tiers **ne sont pas la syntaxe officielle** — ne pas les utiliser.

> ✅ *« Reference the man's face and clothing from Image 1. »*
> ❌ *« @Character1 walks into frame. »*

### Limites de la plateforme

| Paramètre | Seedance 2.0 | Seedance 2.5 |
|---|---|---|
| **Durée générée** | 4 à 15 s | jusqu'à 30 s en un seul segment |
| **Images de référence** | jusqu'à 9 | jusqu'à 50 assets combinés |
| **Vidéos de référence** | 3 max, 15 s cumulées | idem élargi |
| **Audio de référence** | 3 max, 15 s cumulées | idem élargi |
| **Total assets** | 12 max | 50 |

**Choix de production : Seedance 2.0, une génération par plan.** Le modèle sait enchaîner plusieurs plans dans une seule génération, mais on perd le contrôle du timing comique — et le rythme est tout ce qui compte ici. On génère court, on monte serré. La 2.5 n'est utile que pour le film C1, qui a besoin d'une durée continue.

### Règles d'écriture des prompts

- **Une intention par génération.** Une réaction, un geste, un objet.
- **Le bloc Sujet est copié mot pour mot** d'un plan à l'autre pour le même personnage. Une reformulation change le visage.
- **Texte à l'écran : jamais généré.** Caractères rares et accents sortent déformés ; tous les chiffres, incrustations et la décomposition de prix sont ajoutés au montage. C'est aussi ce qui permet de tester les variantes sans regénérer.
- **Dialogue : moins de huit mots**, en plan serré, et toujours précisé *French with an Ivorian (Abidjan) accent* dans le bloc Audio.
- **Jamais de marque réelle** dans un prompt : pas de nom de plateforme VTC, pas de constructeur, pas de logo.

---

## 2. Phase 0 — la banque de références

À produire **avant tout plan vidéo**, en génération d'image, puis à valider une fois pour toutes. C'est cette étape qui décide de la cohérence de la série entière.

### Portraits de personnages

Générer pour chaque personnage **deux images** : un portrait de face neutre (c'est celle sur laquelle le modèle verrouille l'identité) et un plan taille montrant la tenue.

> **Réf. A — Tonton Bra, portrait identité**
> *Frontal headshot of a 52-year-old Ivorian man, stocky build, short greying hair, thin moustache, deep laugh lines around the eyes, neutral expression, looking straight at camera. Plain neutral grey background, head and shoulders only, even soft lighting, photographic, sharp focus.*

> **Réf. B — Tonton Bra, tenue**
> *Waist-up photograph of the same 52-year-old Ivorian man from Image 1, wearing a faded blue mechanic work shirt with grease stains, sleeves rolled up, a red rag hanging from his back pocket. Plain neutral grey background, even lighting, photographic.*

> **Réf. C — Le chauffeur VTC, portrait identité**
> *Frontal headshot of a 34-year-old Ivorian man, slim face, short hair, clean-shaven, calm and slightly tired expression, looking straight at camera. Plain neutral grey background, head and shoulders only, even soft lighting, photographic.*

> **Réf. D — Le chauffeur VTC, tenue**
> *Waist-up photograph of the same man from Image 1, wearing a clean pale blue polo shirt and a plain lanyard around his neck. Plain neutral grey background, even lighting, photographic.*

> **Réf. E — Le gestionnaire de flotte, portrait identité**
> *Frontal headshot of a 45-year-old Ivorian woman, short natural hair, rectangular glasses, composed neutral expression, looking straight at camera. Plain neutral grey background, head and shoulders only, even soft lighting, photographic.*

### Décors de référence

> **Réf. F — La cour de garage**
> *Wide photograph of a corrugated iron garage courtyard in Abidjan, Côte d'Ivoire. Stacked worn tyres, oil cans, a compact sedan on jack stands, a faded painted wall, red laterite ground. Harsh afternoon sunlight, visible dust in the air, documentary photograph.*

> **Réf. G — L'étal de pièces**
> *Photograph of a roadside used car parts stall in Abidjan under a blue tarpaulin, brake pads, filters and belts laid out on wooden crates, busy street visible behind, hard daylight, documentary photograph.*

> **Réf. H — La cour de flotte**
> *Photograph of a small fleet yard at dawn in Abidjan, six compact sedans parked in a row on red laterite ground, low warm light, long shadows, documentary photograph.*

**Convention de chargement** : pour chaque plan, charger le portrait identité en **Image 1**, la tenue en **Image 2**, le décor en **Image 3**. Les prompts ci-dessous supposent cet ordre.

### Réglages seevio, constants sur toute la campagne

Format **9:16**, résolution maximale disponible, durée **5 s** par défaut (8 s pour les plans à dialogue). Ne jamais activer un rendu « cinématique » ou embelli : l'esthétique visée est la vidéo de téléphone.

---

## 3. Campagne A — « Il va savoir s'envoyer »

### A1 · Le prix qui grandit *(film pilote)*

**Références** : Image 1 = Réf. A · Image 2 = Réf. B · Image 3 = Réf. G puis F selon le plan.

> **A1-P1 — L'étiquette** *(5 s, aucun personnage, aucune référence de visage)*
> **Sujet** : a pair of new brake pads on a dusty wooden stall, and a hand placing a small handwritten paper price tag beside them.
> **Mouvement** : the hand enters frame from the right, sets the tag down flat next to the parts, and withdraws. Nothing else moves.
> **Environnement** : reference the roadside parts stall from Image 1 — blue tarpaulin overhead, wooden crates, busy street blurred behind.
> **Esthétique** : handheld smartphone video, harsh afternoon sunlight, visible dust, sensor grain, shallow depth of field, no colour grading.
> **Caméra** : extreme close-up, static except for slight handheld drift.
> **Audio** : ambient street noise, distant traffic and voices. No music, no dialogue.

> **A1-P2 — La main à main** *(5 s — à générer trois fois en variant l'acteur et l'angle)*
> **Sujet** : a man in a stained work shirt handing a small car part to another man standing off-frame.
> **Mouvement** : he passes the part across frame with one hand, then glances directly at the camera with a knowing half-smile. One single gesture, nothing more.
> **Environnement** : reference the garage courtyard from Image 1 — corrugated iron, stacked tyres, oil cans, red laterite ground.
> **Esthétique** : handheld smartphone video, harsh sunlight, dust in the air, sensor grain, no colour grading.
> **Caméra** : medium close-up, slight handheld drift, no zoom.
> **Audio** : ambient garage noise, metal and distant radio. No dialogue.

> **A1-P3 — La facture** *(8 s, dialogue)*
> **Sujet** : reference the man's face from Image 1 and his clothing from Image 2 — a 52-year-old Ivorian mechanic in a stained blue work shirt.
> **Mouvement** : he holds out a folded paper invoice toward the camera with total confidence, smiles broadly, and says one short sentence.
> **Environnement** : reference the garage courtyard from Image 3, an orange taxi parked behind him.
> **Esthétique** : handheld smartphone video, harsh daylight, sensor grain, no colour grading.
> **Caméra** : close-up on his face and the invoice, static with slight handheld drift.
> **Audio** : he says in French with an Ivorian (Abidjan) accent: « C'est le prix du marché, hein. » Ambient garage noise underneath. No music.

**Au montage** : incrustation des chiffres 25 000 → 32 000 → 41 000 → 60 000 sur P1 et les trois variantes de P2, puis écran de décomposition Pièces et la ligne *« Tu as payé la pièce. Et le trajet. Et le neveu. »*

---

### A2 · Occasion baptisée neuve

> **A2-P1 — Le maquillage** *(8 s)*
> **Sujet** : reference the man's face from Image 1 and his clothing from Image 2 — a 52-year-old Ivorian mechanic.
> **Mouvement** : he wipes a dirty used car part with a red rag, holds it up to the light, inspects it with satisfaction, then sprays it with black aerosol paint.
> **Environnement** : reference the garage courtyard from Image 3, workbench in foreground.
> **Esthétique** : handheld smartphone video, harsh sunlight, aerosol mist visible in the air, sensor grain.
> **Caméra** : medium close-up on his hands and the part, slight handheld drift.
> **Audio** : the hiss of the spray can, ambient garage noise. No dialogue.

> **A2-P2 — La bénédiction** *(6 s, dialogue)*
> **Sujet** : reference the man's face from Image 1 and his clothing from Image 2.
> **Mouvement** : he presents the now glossy black part to the camera with both hands, like a jeweller showing a gem, and says one short sentence.
> **Environnement** : reference the garage courtyard from Image 3.
> **Esthétique** : handheld smartphone video, harsh daylight, sensor grain.
> **Caméra** : close-up, static.
> **Audio** : he says in French with an Ivorian (Abidjan) accent: « Pièce d'origine, mon frère. » Ambient garage noise. No music.

**Au montage** : les chips de condition Pièces (Neuf · Occasion importée · Ré-usiné · Aftermarket · OEM) s'affichent une à une, et « Occasion importée » se verrouille.

---

### A3 · Le devis oral

> **A3-P1 — Au téléphone** *(5 s)*
> **Sujet** : reference the man's face from Image 1 and his clothing from Image 2.
> **Mouvement** : he holds a phone to his ear, nods reassuringly, raises three fingers to no one.
> **Environnement** : reference the garage courtyard from Image 3.
> **Esthétique** : handheld smartphone video, harsh daylight, sensor grain.
> **Caméra** : medium close-up, slight drift.
> **Audio** : ambient garage noise, one-sided muffled phone conversation, no intelligible words.

> **A3-P2 — Dans la cour** *(5 s)*
> **Sujet** : reference the man's face from Image 1 and his clothing from Image 2.
> **Mouvement** : he stands beside an open car bonnet, gestures at the engine with an open palm, shrugs apologetically.
> **Environnement** : reference the garage courtyard from Image 3, a compact sedan with the bonnet up.
> **Esthétique** : handheld smartphone video, harsh daylight, sensor grain.
> **Caméra** : medium shot, slight drift.
> **Audio** : ambient garage noise. No dialogue.

> **A3-P3 — À la caisse** *(6 s, dialogue)*
> **Sujet** : reference the man's face from Image 1 and his clothing from Image 2.
> **Mouvement** : he leans on a small counter, pushes a handwritten paper toward the camera without looking at it, and says one short sentence.
> **Environnement** : a cramped garage office with a plastic chair, a wall calendar and a ceiling fan, hot afternoon light through half-closed blinds.
> **Esthétique** : handheld smartphone video, sensor grain, no colour grading.
> **Caméra** : close-up on the paper and his hand, static.
> **Audio** : he says in French with an Ivorian (Abidjan) accent: « Il y a eu des imprévus. » Ceiling fan hum. No music.

**Au montage** : trois chiffres différents apparaissent sur les trois plans, puis un devis Pièces figé, horodaté.

---

### A4 · Tu connais le prix ?

Format micro-trottoir. **Quatre générations, quatre personnages différents** — un client par génération, aucune réutilisation. Ne pas charger de référence de visage : la variété est ici l'effet recherché.

> **A4-P1 à P3 — Les trois réponses** *(6 s chacune, dialogue)*
> **Sujet** : an Ivorian adult standing on a busy Abidjan street, facing the camera as if answering a street interview. *(Varier à chaque génération : a young woman in an office blouse / a man in his sixties in a light boubou / a young man in a football shirt.)*
> **Mouvement** : the person thinks for a moment, looks slightly upward, then answers with confidence and says one short sentence.
> **Environnement** : busy Abidjan street, traffic and pedestrians blurred behind, hard daylight.
> **Esthétique** : handheld smartphone video, vertical street interview look, sensor grain, no colour grading.
> **Caméra** : chest-up shot, slight handheld drift.
> **Audio** : the person says in French with an Ivorian (Abidjan) accent, one of: « Ça fait 15 000. » / « Non, c'est 30 000. » / « Moi j'ai payé 45 000. » Street ambience.

> **A4-P4 — Le quatrième** *(6 s)*
> **Sujet** : a young Ivorian man in a plain t-shirt standing on the same busy street, holding a smartphone.
> **Mouvement** : he does not answer. He simply looks down at his phone screen, scrolls once with his thumb, then looks back up at the camera and smiles.
> **Environnement** : busy Abidjan street, traffic blurred behind, hard daylight.
> **Esthétique** : handheld smartphone video, sensor grain.
> **Caméra** : chest-up shot, slight drift, then push slightly toward the phone screen.
> **Audio** : street ambience only. No dialogue.

**Au montage** : la question « Une plaquette de frein, c'est combien ? » en carton d'ouverture, l'écran de décomposition Pièces sur le plan 4.

---

### A5 · La pièce fantôme

> **A5-P1 — La facture** *(5 s)*
> **Sujet** : reference the man's face from Image 1 and his clothing from Image 2.
> **Mouvement** : he taps a line on a paper invoice twice with his index finger, nodding firmly.
> **Environnement** : reference the garage courtyard from Image 3.
> **Esthétique** : handheld smartphone video, harsh daylight, sensor grain.
> **Caméra** : close-up on the invoice and his hand, static.
> **Audio** : ambient garage noise.

> **A5-P2 — Le vide** *(6 s)*
> **Sujet** : an open car engine bay, dusty and untouched, with a visible empty bracket where a part should be mounted.
> **Mouvement** : a hand enters frame, points at the empty bracket, and stays still.
> **Environnement** : reference the garage courtyard from Image 1, a compact sedan with the bonnet up.
> **Esthétique** : handheld smartphone video, harsh daylight, dust, sensor grain.
> **Caméra** : close-up into the engine bay, slow slight push in.
> **Audio** : ambient garage noise, no dialogue, sudden absence of music.

---

### A6 · Le grand frère du fournisseur

> **A6-P1 — La chaîne** *(8 s)*
> **Sujet** : a small car part being passed from hand to hand between four different men standing in a line.
> **Mouvement** : each man takes the part, holds it briefly, and passes it to the next. The gesture repeats identically down the line.
> **Environnement** : reference the garage courtyard from Image 1, corrugated iron and stacked tyres.
> **Esthétique** : handheld smartphone video, harsh sunlight, dust, sensor grain.
> **Caméra** : medium wide shot, slow lateral pan following the part along the line.
> **Audio** : ambient garage noise, overlapping friendly greetings, no intelligible words.

> **A6-P2 — Le dernier frère** *(6 s, dialogue)*
> **Sujet** : reference the man's face from Image 1 and his clothing from Image 2.
> **Mouvement** : he receives the part, holds it up, shrugs cheerfully and says one short sentence directly to camera.
> **Environnement** : reference the garage courtyard from Image 3.
> **Esthétique** : handheld smartphone video, harsh daylight, sensor grain.
> **Caméra** : close-up, static.
> **Audio** : he says in French with an Ivorian (Abidjan) accent: « Tout le monde est frère ici. » Ambient garage noise.

**Au montage** : « + 5 000 F » apparaît à chaque passage de main, en compteur cumulatif.

---

### A7 · Le diagnostic élastique

> **A7-P1 — La question** *(6 s, dialogue)*
> **Sujet** : reference the man's face from Image 1 and his clothing from Image 2, standing beside an open car bonnet with a client off-frame.
> **Mouvement** : he leans over the engine, listens, straightens up slowly, and asks one short question toward the off-frame client.
> **Environnement** : reference the garage courtyard from Image 3.
> **Esthétique** : handheld smartphone video, harsh daylight, sensor grain.
> **Caméra** : medium close-up, slight drift.
> **Audio** : he says in French with an Ivorian (Abidjan) accent: « Tu connais un peu en mécanique ? » Ambient garage noise.

> **A7-P2 — La réponse** *(5 s)*
> **Sujet** : a well-dressed Ivorian man in his thirties in a clean shirt, standing in a garage courtyard.
> **Mouvement** : he shakes his head slightly and smiles apologetically, hands in his pockets.
> **Environnement** : reference the garage courtyard from Image 1.
> **Esthétique** : handheld smartphone video, harsh daylight, sensor grain.
> **Caméra** : chest-up shot, static.
> **Audio** : ambient garage noise. No dialogue.

> **A7-P3 — La panne qui grossit** *(8 s)*
> **Sujet** : reference the man's face from Image 1 and his clothing from Image 2.
> **Mouvement** : he turns back to the engine and begins pointing at one part after another, faster and faster, listing problems with growing enthusiasm.
> **Environnement** : reference the garage courtyard from Image 3, a compact sedan with the bonnet up.
> **Esthétique** : handheld smartphone video, harsh daylight, sensor grain.
> **Caméra** : medium shot, slight handheld drift, no zoom.
> **Audio** : indistinct fast French muttering with an Ivorian accent, ambient garage noise.

---

### A8 à A11 · Les formats courts TikTok

Moins de 12 s, **une seule génération de 8 s** plus un carton final. Ils font le volume organique et se produisent en série sur une seule session.

Patron de prompt, à décliner sur les quatre :

> **Sujet** : reference the man's face from Image 1 and his clothing from Image 2.
> **Mouvement** : he looks straight into the camera and says one short sentence, then raises his eyebrows and holds the look. *(Varier la réplique — voir ci-dessous.)*
> **Environnement** : reference the garage courtyard from Image 3.
> **Esthétique** : handheld smartphone video, harsh daylight, sensor grain.
> **Caméra** : close-up, static.
> **Audio** : French with an Ivorian (Abidjan) accent, ambient garage noise, no music.

Répliques à décliner : « Le prix, c'est moi qui décide. » · « Tu veux la facture ou tu veux la pièce ? » · « Mon fournisseur, c'est mon cousin. » · « Toi tu poses trop de questions. »

---

## 4. Campagne B — « La journée perdue » (VTC)

**Références** : Image 1 = Réf. C · Image 2 = Réf. D · Image 3 = Réf. H.

### B1 · Le calcul du chauffeur *(film pilote)*

> **B1-P1 — La victoire** *(6 s)*
> **Sujet** : reference the man's face from Image 1 and his clothing from Image 2 — a 34-year-old Ivorian driver in a pale blue polo shirt.
> **Mouvement** : he walks away from a parts stall holding a small box under his arm, grinning to himself, clearly pleased with the deal he just made.
> **Environnement** : a roadside car parts stall in Abidjan, blue tarpaulin, busy street.
> **Esthétique** : handheld smartphone video, hard daylight, sensor grain, no colour grading.
> **Caméra** : medium shot following him for two steps, slight handheld drift.
> **Audio** : street ambience. No dialogue.

> **B1-P2 — Les trois jours** *(8 s)*
> **Sujet** : a compact sedan standing still in a yard, bonnet open, nobody around it.
> **Mouvement** : the car does not move at all. Light shifts across it from morning to evening and back, three times, as time passes. Dust settles on the windscreen.
> **Environnement** : reference the fleet yard from Image 1, red laterite ground, a wall behind.
> **Esthétique** : time-lapse feel, handheld smartphone framing, sensor grain, no colour grading.
> **Caméra** : locked static wide shot, no movement whatsoever.
> **Audio** : sparse ambience, distant street sounds, no music.

> **B1-P3 — Le sourire qui s'éteint** *(6 s)*
> **Sujet** : reference the man's face from Image 1 and his clothing from Image 2, sitting in the driver's seat of a stationary car.
> **Mouvement** : he is still smiling faintly. The smile fades slowly as he stares ahead, then he exhales and looks down.
> **Environnement** : interior of a compact sedan parked in a yard, warm late light through the windscreen.
> **Esthétique** : handheld smartphone video, sensor grain, no colour grading.
> **Caméra** : close-up on his face from the passenger seat, static.
> **Audio** : faint street ambience. No music, no dialogue.

**Au montage** : « − 8 000 F économisés » sur P1, compteur qui monte à « − 90 000 F de recette » sur P2, décomposition Pièces et livraison le jour même en chute.

---

### B2 · La file d'attente

> **B2-P1 — Le véhicule à l'arrêt** *(6 s)*
> **Sujet** : a compact sedan parked motionless in a fleet yard with one wheel removed and a jack under it.
> **Mouvement** : nothing moves except a plastic bag drifting across the ground in the wind.
> **Environnement** : reference the fleet yard from Image 1 at midday, harsh light, red laterite ground.
> **Esthétique** : handheld smartphone video, sensor grain, dust, no colour grading.
> **Caméra** : static wide shot.
> **Audio** : wind, distant traffic. No music.

> **B2-P2 — Le téléphone** *(8 s)*
> **Sujet** : a smartphone lying face up on the dashboard of a stationary car, screen lighting up repeatedly.
> **Mouvement** : the screen lights up, goes dark, lights up again, again, again — notification after notification, each one ignored. Nobody reaches for it.
> **Environnement** : interior of a parked car, dim, hot afternoon light through the windscreen.
> **Esthétique** : handheld smartphone video, sensor grain, no colour grading.
> **Caméra** : close-up on the phone, static, slight drift.
> **Audio** : a soft repeated notification chime, growing more frequent. No music, no dialogue.

**Au montage** : aucune parole — le film est conçu pour le visionnage muet, les notifications sont sous-titrées en « nouvelle course ».

---

### B3 · Le chauffeur qui sait

> **B3-P1 — Ceux qui attendent** *(6 s)*
> **Sujet** : three Ivorian drivers standing idle in a fleet yard beside two stationary cars with open bonnets.
> **Mouvement** : they stand around, one checks his watch, another kicks a pebble. Nobody is working.
> **Environnement** : reference the fleet yard from Image 1 at dawn, low warm light, long shadows.
> **Esthétique** : handheld smartphone video, sensor grain, no colour grading.
> **Caméra** : medium wide shot, slight handheld drift.
> **Audio** : sparse morning ambience, a rooster in the distance. No dialogue.

> **B3-P2 — Celui qui roule** *(6 s)*
> **Sujet** : reference the man's face from Image 1 and his clothing from Image 2, sitting in the driver's seat of a moving car.
> **Mouvement** : he drives calmly, one hand on the wheel, glances in the rear-view mirror and gives a small satisfied nod.
> **Environnement** : Abidjan street seen through the windscreen in early morning light, light traffic.
> **Esthétique** : handheld smartphone video from the passenger seat, sensor grain, no colour grading.
> **Caméra** : close-up on his face, gentle natural vehicle motion.
> **Audio** : engine and road noise. No dialogue, no music.

---

### B4 · Le gestionnaire de flotte *(B2B)*

> **B4-P1 — Le tableau** *(6 s)*
> **Sujet** : reference the woman's face from Image 1 — a 45-year-old Ivorian woman with rectangular glasses, seated at a desk in front of a laptop.
> **Mouvement** : she scrolls slowly down a spreadsheet on the screen, stops, and her jaw tightens slightly.
> **Environnement** : a plain office with half-closed blinds, neon ceiling light, a printed document beside the laptop.
> **Esthétique** : handheld smartphone video, flat neon light, sensor grain, no colour grading.
> **Caméra** : over-the-shoulder medium shot, slight drift. The screen content is not legible.
> **Audio** : quiet office ambience, air conditioning hum. No dialogue.

> **B4-P2 — La cour** *(6 s)*
> **Sujet** : reference the woman's face from Image 1, standing in a fleet yard looking at a row of parked cars.
> **Mouvement** : she looks along the row, then at two cars standing apart with their bonnets open, and folds her arms.
> **Environnement** : reference the fleet yard from Image 2, morning light.
> **Esthétique** : handheld smartphone video, sensor grain, no colour grading.
> **Caméra** : medium shot from behind and slightly to the side, static.
> **Audio** : yard ambience. No dialogue.

**Au montage** : deux lignes rouges dans le tableau, puis « votre parc, vos pièces, un seul prix, une seule facture ».

---

## 5. Campagne C — « Nous chiffrons l'attente » (logistique)

Ton froid, cadres fixes, aucun nouchi, aucun personnage récurrent. Ces plans doivent rester présentables en rendez-vous commercial.

### C1 · 45 jours *(film pilote — le seul candidat Seedance 2.5)*

Le gag repose sur la **durée continue** : plus le plan dure, plus il est drôle. À générer en 2.5 sur un seul segment de 20 à 30 s si disponible ; sinon en trois segments 2.0 raccordés au montage sur le même cadre fixe.

> **C1 — Le véhicule oublié** *(20–30 s, ou 3 × 8 s)*
> **Sujet** : a white utility van standing completely motionless in an empty concrete yard.
> **Mouvement** : the van never moves. Around it, time passes fast: sunlight sweeps across the wall day after day, shadows rotate, dust accumulates on the windscreen and bonnet, a puddle forms and dries, weeds grow at the tyres. Nothing human enters the frame.
> **Environnement** : a bare concrete industrial yard in Abidjan, a plain wall behind, a closed metal gate to one side.
> **Esthétique** : time-lapse, flat neutral daylight, documentary, no colour grading, no stylisation.
> **Caméra** : locked static wide shot on a tripod. Absolutely no camera movement.
> **Audio** : low continuous ambient hum, no music, no voices.

**Au montage** : le calendrier défile en coin d'image, un compteur monte lentement jusqu'à 1 350 000 F (45 jours × 30 000 F), puis la ligne *« Le fret maritime était moins cher. »* et la matrice d'arbitrage.

---

### C2 · Le devis du transitaire

> **C2-P1 — La relecture** *(8 s)*
> **Sujet** : a man in his forties in a plain shirt sitting at an office desk, holding a single printed sheet of paper.
> **Mouvement** : he reads the sheet, turns it over, finds nothing on the back, turns it back and reads it again from the top. Perfectly straight-faced.
> **Environnement** : a bare office, neon ceiling light, half-closed blinds, an empty desk.
> **Esthétique** : flat neutral light, static documentary look, sensor grain, no colour grading.
> **Caméra** : medium close-up, locked static.
> **Audio** : neon buzz, paper rustle. No music, no dialogue.

> **C2-P2 — La question** *(6 s)*
> **Sujet** : the same man from Image 1, still holding the sheet.
> **Mouvement** : he slowly raises his eyes from the page and looks straight into the camera, saying nothing.
> **Environnement** : the same bare office.
> **Esthétique** : flat neutral light, sensor grain, no colour grading.
> **Caméra** : close-up, locked static.
> **Audio** : neon buzz only. Complete absence of music.

**Au montage** : les trois options du devis s'affichent, la colonne « date » reste vide. Puis la matrice Pièces, où elle est remplie.

---

### C3 · La pièce qui n'existe pas encore

> **C3-P1 — L'attente** *(6 s)*
> **Sujet** : a compact sedan on a lift in an empty workshop, one wheel arch open, no part fitted.
> **Mouvement** : nothing moves. A single overhead light sways almost imperceptibly.
> **Environnement** : a clean empty workshop at night, concrete floor, tools stored away, nobody present.
> **Esthétique** : cold neutral light, static documentary look, no colour grading.
> **Caméra** : locked static medium wide shot.
> **Audio** : deep silence, a faint electrical hum.

> **C3-P2 — La naissance de la pièce** *(8 s)*
> **Sujet** : an industrial press stamping a metal car part on a factory line.
> **Mouvement** : the press comes down once, slowly, and a single part emerges. Only one. The line is otherwise empty in both directions.
> **Environnement** : a large industrial factory floor, cold overhead lighting, empty conveyor.
> **Esthétique** : cold neutral light, industrial documentary, no colour grading, no stylisation.
> **Caméra** : locked static medium shot.
> **Audio** : one heavy mechanical impact, then silence. No music.

**Au montage** : « Votre véhicule attend qu'une pièce soit fabriquée. » Aucune marque de constructeur nommée, à l'image comme au texte.

---

## 6. Ordre de production recommandé

1. **Phase 0** — les 8 images de référence, validées et archivées. Ne plus jamais les regénérer : toute la cohérence de la série en dépend.
2. **A1 en entier**, du plan 1 au montage final. C'est le test de faisabilité : si Tonton Bra ne tient pas sur trois plans, corriger les fiches de référence **avant** de produire quoi que ce soit d'autre.
3. **A8 à A11**, les quatre formats courts, en une seule session — même personnage, même décor, même réglage.
4. **A2 à A7**, dans l'ordre de préférence après arbitrage sur les premiers résultats de rétention.
5. **B1 puis B2**, qui ne demandent aucune référence de Tonton Bra et peuvent tourner en parallèle.
6. **C1 en dernier**, une fois tranchée la question 2.0 contre 2.5.

_Syntaxe de référencement et limites d'assets conformes au guide de prompt et à la documentation API seevio.ai (consultés le 15 août 2026) ; ces limites évoluent avec les versions du modèle — vérifier avant une grosse session de production. Les répliques de dialogue sont fictionnelles et interprétées par des voix générées. Document interne Pièces._
