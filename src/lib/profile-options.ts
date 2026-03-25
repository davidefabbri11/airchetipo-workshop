import type { ProfileInput } from "@/lib/validations/profile";

export { AVAILABLE_CUISINES } from "@/lib/constants/cuisines";

type ActivityLevel = ProfileInput["activityLevel"];
type Goal = ProfileInput["goal"];

export const ACTIVITY_OPTIONS: {
  value: ActivityLevel;
  icon: string;
  name: string;
  desc: string;
}[] = [
  {
    value: "SEDENTARY",
    icon: "\u{1F9D8}",
    name: "Sedentario",
    desc: "Lavoro d'ufficio, poco movimento quotidiano",
  },
  {
    value: "LIGHT",
    icon: "\u{1F6B6}",
    name: "Leggero",
    desc: "Camminate regolari, 1-2 allenamenti a settimana",
  },
  {
    value: "MODERATE",
    icon: "\u{1F3C3}",
    name: "Moderato",
    desc: "3-5 allenamenti a settimana, stile di vita attivo",
  },
  {
    value: "INTENSE",
    icon: "\u{1F3CB}\u{FE0F}",
    name: "Intenso",
    desc: "6-7 allenamenti, sport competitivo o lavoro fisico",
  },
];

export const GOAL_OPTIONS: {
  value: Goal;
  icon: string;
  name: string;
  desc: string;
}[] = [
  {
    value: "LOSE_WEIGHT",
    icon: "\u{2B07}\u{FE0F}",
    name: "Perdita peso",
    desc: "Deficit calorico controllato per perdere peso in modo sano e sostenibile.",
  },
  {
    value: "GAIN_MUSCLE",
    icon: "\u{1F4AA}",
    name: "Aumento massa",
    desc: "Surplus calorico mirato con alto apporto proteico per massa muscolare magra.",
  },
  {
    value: "REDUCE_FAT",
    icon: "\u{1F525}",
    name: "Riduzione grasso",
    desc: "Ricomposizione corporea \u2014 perdere grasso mantenendo la massa muscolare.",
  },
  {
    value: "MAINTAIN",
    icon: "\u{2696}\u{FE0F}",
    name: "Mantenimento",
    desc: "Mantieni il peso attuale con una dieta equilibrata e nutriente.",
  },
];
