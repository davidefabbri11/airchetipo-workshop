import { z } from "zod";

export const selectedGoalSchema = z.object({
  targetCalories: z
    .number({ error: "Il target calorico è obbligatorio" })
    .int("Il target calorico deve essere un numero intero")
    .min(800, "Il target calorico deve essere almeno 800 kcal")
    .max(10000, "Il target calorico non può superare 10.000 kcal"),
  goalDescription: z
    .string({ error: "La descrizione obiettivo è obbligatoria" })
    .min(1, "La descrizione obiettivo non può essere vuota")
    .max(500, "La descrizione obiettivo non può superare 500 caratteri"),
});

export type SelectedGoalInput = z.infer<typeof selectedGoalSchema>;
