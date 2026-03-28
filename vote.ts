const PARTIS = [
  "LR",
  "PS",
  "EELV",
  "LFI",
  "RN",
  "LREM_MODEM",
  "PCF",
  "DVG",
  "DVEXG",
  "DVD",
  "DVC",
  "LO",
  "NPA",
  "OTHER",
];

const PARTI_COLOR_MAPPING: Record<string, string> = {
  LR: "#0000FF",
  PS: "#FF69B4",
  EELV: "#00FF00",
  LFI: "#FF0000",
  RN: "#000000",
  LREM_MODEM: "#FFFF00",
  PCF: "#8B0000",
  DVG: "linear-gradient(90deg, #FF69B4, #FFD700)",
  DVEXG: "#A52A2A",
  DVD: "#ADD8E6",
  DVC: "#FF8C00",
  LO: "#4A0000",
  NPA: "#4A0000",
  OTHER: "#C0C0C0",
};

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

export interface VoteCommon {
  bureau_de_vote: string;
  inscrits: number;
  procurations: number;
  nuls: number;
  exprimes: number;
}

export interface Vote2014 extends VoteCommon {
  votants: number;
  // candidats
  chiron: number;
  garnier: number;
  croupy: number;
  bouchet: number;
  gobet: number;
  kongolo: number;
  van_goethem: number;
  bruckert: number;
  defrance: number;
  rolland: number;
}

export interface Vote2020Round1 extends VoteCommon {
  votants: number;
  blancs: number;
  // candidats
  nb_voix_01: number;
  nb_voix_02: number;
  nb_voix_03: number;
  nb_voix_04: number;
  nb_voix_05: number;
  nb_voix_06: number;
  nb_voix_07: number;
  nb_voix_08: number;
  nb_voix_09: number;
}

export interface Vote2020Round2 extends VoteCommon {
  votants: number;
  blancs: number;
  // candidats
  nb_voix_01: number;
  nb_voix_02: number;
  nb_voix_03: number;
}

export interface Vote2026Round1 extends VoteCommon {
  idbureau: string;
  blancs: number;
  // candidats
  npa_revolutionnaires_nantes_ouvriere_et_revolutionnaire: number;
  nantes_merite_mieux: number;
  lutte_ouvriere_le_camp_des_travailleurs: number;
  nantes_populaire: number;
  pour_une_nantes_sure: number;
  la_gauche_unie_pour_nantes: number;
  votre_nouveau_souffle_pour_nantes: number;
  nouvelle_nantes: number;
}

export interface Vote2026Round2 extends VoteCommon {
  idbureau: string;
  blancs: number;
  // candidats
  la_gauche_unie_pour_nantes: number;
  votre_nouveau_souffle_pour_nantes: number;
}
