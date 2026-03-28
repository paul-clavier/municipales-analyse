import { readFileSync, writeFileSync } from "fs";

const PARTIS_MAPPING_2014: Record<string, string> = {
  chiron: "EELV",
  garnier: "LR",
  croupy: "LFI",
  bouchet: "RN",
  gobet: "DVD",
  kongolo: "OTHER",
  van_goethem: "DVD",
  bruckert: "LREM_MODEM",
  defrance: "LO",
  rolland: "PS",
};

const ROUND = 1;

const bureaux = JSON.parse(readFileSync("./bureaux_2014.json", "utf-8"));
const votes = JSON.parse(readFileSync(`./nantes_2014_${ROUND}.json`, "utf-8"));

// Build a lookup map: idburo -> bureau data
const bureauMap = new Map<string, any>();
for (const bureau of bureaux) {
  bureauMap.set(bureau.idburo, bureau);
}

const enriched = votes.map((vote: any) => {
  // Extract bureau number from "0911 - Bureau de vote 0911"
  const bureauId = vote.bureau_de_vote.split(" - ")[0];
  const bureau = bureauMap.get(bureauId);

  if (!bureau) {
    console.warn(`No bureau found for ${bureauId}`);
    return vote;
  }

  // Replace candidate keys with parti names, summing when multiple candidates map to the same parti
  const partiVotes: Record<string, number> = {};
  for (const [candidate, parti] of Object.entries(PARTIS_MAPPING_2014)) {
    if (candidate in vote) {
      partiVotes[parti] =
        (partiVotes[parti] || 0) + (vote[candidate] as number);
    }
  }

  // Keep non-candidate fields
  const {
    chiron,
    garnier,
    croupy,
    bouchet,
    gobet,
    kongolo,
    van_goethem,
    bruckert,
    defrance,
    rolland,
    ...rest
  } = vote;

  return {
    ...rest,
    ...partiVotes,
    geometry: bureau.geometry,
    lieu_nom: bureau.lieu_nom,
    lieu_site: bureau.lieu_site,
  };
});

writeFileSync(
  `./nantes_2014_${ROUND}_mapped.json`,
  JSON.stringify(enriched, null, 2),
);
console.log(`Enriched ${enriched.length} vote records`);
