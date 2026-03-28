import { readFileSync, writeFileSync } from "fs";

const PARTIS_MAPPING_2026: Record<string, string> = {
  npa_revolutionnaires_nantes_ouvriere_et_revolutionnaire: "NPA",
  nantes_merite_mieux: "DVC",
  lutte_ouvriere_le_camp_des_travailleurs: "LO",
  nantes_populaire: "DVEXG",
  pour_une_nantes_sure: "RN",
  la_gauche_unie_pour_nantes: "PS",
  votre_nouveau_souffle_pour_nantes: "LR",
  nouvelle_nantes: "LFI",
};

const ROUND = 2;

const bureaux = JSON.parse(readFileSync("./bureau_2026.json", "utf-8"));
const votes = JSON.parse(readFileSync(`./nantes_2026_${ROUND}.json`, "utf-8"));

// Build a lookup map: idbureau -> bureau data
const bureauMap = new Map<string, any>();
for (const bureau of bureaux) {
  bureauMap.set(bureau.idbureau, bureau);
}

const enriched = votes.map((vote: any) => {
  const bureau = bureauMap.get(vote.idbureau);

  if (!bureau) {
    console.warn(`No bureau found for ${vote.idbureau}`);
    return vote;
  }

  // Replace candidate keys with parti names, summing when multiple candidates map to the same parti
  const partiVotes: Record<string, number> = {};
  const rest: Record<string, any> = {};
  for (const [key, value] of Object.entries(vote)) {
    if (key in PARTIS_MAPPING_2026) {
      const parti = PARTIS_MAPPING_2026[key];
      partiVotes[parti] = (partiVotes[parti] || 0) + (value as number);
    } else {
      rest[key] = value;
    }
  }

  return {
    ...rest,
    ...partiVotes,
    geometry: bureau.geo_shape,
    lieu_nom: bureau.nom,
    lieu_site: bureau.site,
  };
});

writeFileSync(
  `./nantes_2026_${ROUND}_mapped.json`,
  JSON.stringify(enriched, null, 2),
);
console.log(`Enriched ${enriched.length} vote records`);
