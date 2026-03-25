import { z } from "zod";
import { AVAILABLE_CUISINES } from "@/lib/constants/cuisines";

const CUISINE_IDS = AVAILABLE_CUISINES.map((c) => c.id) as [string, ...string[]];

export const profileSchema = z.object({
  height: z
    .number({ error: "L'altezza è obbligatoria" })
    .min(50, "L'altezza deve essere almeno 50 cm")
    .max(300, "L'altezza deve essere al massimo 300 cm"),
  weight: z
    .number({ error: "Il peso è obbligatorio" })
    .min(20, "Il peso deve essere almeno 20 kg")
    .max(500, "Il peso deve essere al massimo 500 kg"),
  age: z
    .number({ error: "L'età è obbligatoria" })
    .int("L'età deve essere un numero intero")
    .min(10, "L'età deve essere almeno 10 anni")
    .max(120, "L'età deve essere al massimo 120 anni"),
  activityLevel: z.enum(["SEDENTARY", "LIGHT", "MODERATE", "INTENSE"], {
    error: "Il livello di attività è obbligatorio",
  }),
  goal: z.enum(["LOSE_WEIGHT", "GAIN_MUSCLE", "REDUCE_FAT", "MAINTAIN"], {
    error: "L'obiettivo è obbligatorio",
  }),
  cuisines: z
    .array(z.enum(CUISINE_IDS))
    .min(1, "Seleziona almeno una cucina"),
});

export type ProfileInput = z.infer<typeof profileSchema>;
