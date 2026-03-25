import { generateText, Output } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { mealAnalysisSchema, type MealAnalysisInput } from "@/lib/validations/meal";

export type { MealAnalysisInput as MealAnalysis };

const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
});

export class VisionAnalysisError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "VisionAnalysisError";
  }
}

export async function analyzeImage(imageUrl: string): Promise<MealAnalysisInput> {
  try {
    const { output } = await generateText({
      model: openrouter("google/gemini-flash-1.5"),
      output: Output.object({ schema: mealAnalysisSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              image: imageUrl,
            },
            {
              type: "text",
              text: `Analizza questa foto di un piatto e identifica tutti i componenti alimentari visibili.
Per ogni componente stima:
- name: nome del componente (in italiano, es. "pollo alla griglia", "riso basmati", "patatine fritte")
- estimatedGrams: peso stimato in grammi
- calories: calorie stimate per la porzione identificata
- proteins: proteine in grammi per la porzione
- carbs: carboidrati in grammi per la porzione
- fats: grassi in grammi per la porzione

Sii preciso e realistico nelle stime. Considera le dimensioni tipiche delle porzioni.
Restituisci un oggetto con un array "components" contenente tutti i componenti identificati.`,
            },
          ],
        },
      ],
    });

    return output;
  } catch (err) {
    throw new VisionAnalysisError(
      "Impossibile analizzare l'immagine. Riprova con una foto più nitida.",
      err
    );
  }
}
