import { z } from "zod";

export const mealCreateSchema = z.object({
  imageUrl: z
    .string()
    .min(1, "Il percorso dell'immagine è obbligatorio")
    .url("L'URL dell'immagine non è valido"),
});

export type MealCreateInput = z.infer<typeof mealCreateSchema>;

export const mealComponentSchema = z.object({
  name: z.string().min(1, "Il nome del componente è obbligatorio"),
  estimatedGrams: z.number().positive("I grammi devono essere maggiori di 0"),
  calories: z.number().min(0, "Le calorie non possono essere negative"),
  proteins: z.number().min(0, "Le proteine non possono essere negative"),
  carbs: z.number().min(0, "I carboidrati non possono essere negativi"),
  fats: z.number().min(0, "I grassi non possono essere negativi"),
});

export type MealComponentInput = z.infer<typeof mealComponentSchema>;

export const mealAnalysisSchema = z.object({
  components: z.array(mealComponentSchema).min(1, "Almeno un componente è richiesto"),
});

export type MealAnalysisInput = z.infer<typeof mealAnalysisSchema>;
