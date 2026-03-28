import { readFileSync, writeFileSync } from "fs";

const CANDIDATES_MAPPING_2020_1: Record<string, string> = {
  nb_voix_01: "sonnier",
  nb_voix_02: "chami",
  nb_voix_03: "medkour",
  nb_voix_04: "laernos",
  nb_voix_05: "rolland",
  nb_voix_06: "bazille",
  nb_voix_07: "revel",
  nb_voix_08: "garnier",
  nb_voix_09: "oppelt",
};

const CANDIDATES_MAPPING_2020_2: Record<string, string> = {
  nb_voix_01: "rolland",
  nb_voix_02: "garnier",
  nb_voix_03: "oppelt",
};

const PARTIS_MAPPING_2020: Record<string, string> = {
  sonnier: "OTHER",
  chami: "NPA",
  medkour: "LFI",
  laernos: "EELV",
  rolland: "PS",
  bazille: "LO",
  revel: "RN",
  garnier: "LR",
  oppelt: "LREM_MODEM",
};

const ROUND = 2;

const candidatesMapping =
  ROUND === 1 ? CANDIDATES_MAPPING_2020_1 : CANDIDATES_MAPPING_2020_2;

const bureaux = JSON.parse(readFileSync("./bureaux_2020.json", "utf-8"));
const votes = JSON.parse(readFileSync(`./nantes_2020_${ROUND}.json`, "utf-8"));

// Build a lookup map: numero_bureau -> bureau data
const bureauMap = new Map<string, any>();
for (const bureau of bureaux) {
  bureauMap.set(bureau.numero_bureau, bureau);
}

const enriched = votes.map((vote: any) => {
  // Extract bureau number from "132 - Ecole Maternelle \"Sully\""
  const bureauId = vote.bureau_de_vote.split(" - ")[0];
  const bureau = bureauMap.get(bureauId);

  if (!bureau) {
    console.warn(`No bureau found for ${bureauId}`);
    return vote;
  }

  // Replace nb_voix keys with parti names, summing when multiple candidates map to the same parti
  const partiVotes: Record<string, number> = {};
  for (const [voixKey, candidate] of Object.entries(candidatesMapping)) {
    if (voixKey in vote) {
      const parti = PARTIS_MAPPING_2020[candidate];
      partiVotes[parti] = (partiVotes[parti] || 0) + (vote[voixKey] as number);
    }
  }

  // Keep non-candidate fields
  const rest: Record<string, any> = {};
  for (const [key, value] of Object.entries(vote)) {
    if (!key.startsWith("nb_voix_")) {
      rest[key] = value;
    }
  }

  return {
    ...rest,
    ...partiVotes,
    geometry: bureau.geometry,
    lieu_nom: bureau.nom,
    lieu_site: bureau.site,
  };
});

writeFileSync(
  `./nantes_2020_${ROUND}_mapped.json`,
  JSON.stringify(enriched, null, 2),
);
console.log(`Enriched ${enriched.length} vote records`);
