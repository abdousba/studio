'use server';

/**
 * @fileOverview Un agent IA pour suggérer des ajustements de stock basés sur les données d'inventaire.
 *
 * - suggestStockAdjustment - Une fonction qui suggère des ajustements de stock.
 * - StockAdjustmentInput - Le type d'entrée pour la fonction suggestStockAdjustment.
 * - StockAdjustmentOutput - Le type de retour pour la fonction suggestStockAdjustment.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StockAdjustmentInputSchema = z.object({
  drugName: z.string().describe('Le nom du médicament.'),
  currentStock: z.number().describe('Le niveau de stock actuel du médicament.'),
  expiryDate: z.string().describe("La date d'expiration du médicament (AAAA-MM-JJ)."),
});
export type StockAdjustmentInput = z.infer<typeof StockAdjustmentInputSchema>;

const StockAdjustmentOutputSchema = z.object({
  adjustmentSuggestion: z
    .string()
    .describe(
      "Une suggestion pour ajuster le niveau de stock, en tenant compte de la date d'expiration et du stock actuel."
    ),
  suggestedQuantity: z
    .number()
    .optional()
    .describe('La quantité suggérée pour ajuster le stock.'),
  reason: z
    .string()
    .optional()
    .describe("La raison de l'ajustement suggéré."),
});
export type StockAdjustmentOutput = z.infer<typeof StockAdjustmentOutputSchema>;

export async function suggestStockAdjustment(
  input: StockAdjustmentInput
): Promise<StockAdjustmentOutput> {
  return stockAdjustmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'stockAdjustmentPrompt',
  input: {schema: StockAdjustmentInputSchema},
  output: {schema: StockAdjustmentOutputSchema},
  prompt: `Vous êtes un gestionnaire de pharmacie expert. Vous recevrez des informations sur un médicament, y compris son nom, son niveau de stock actuel et sa date d'expiration. Sur la base de ces informations, vous suggérerez un ajustement du niveau de stock pour minimiser le gaspillage et assurer une allocation efficace des ressources.

Nom du médicament: {{{drugName}}}
Stock actuel: {{{currentStock}}}
Date d'expiration: {{{expiryDate}}}

Tenez compte de la date d'expiration et du niveau de stock actuel pour déterminer l'ajustement optimal. Si la date d'expiration est proche, suggérez de réduire le niveau de stock. Si le niveau de stock est bas et que la date d'expiration est éloignée, suggérez de maintenir le niveau de stock ou de l'augmenter si nécessaire. Fournissez toujours une raison à votre suggestion. Suggérez également une quantité à réduire, le cas échéant. Si la date d'expiration est éloignée et que le stock actuel est approprié, suggérez simplement de maintenir le stock actuel.

Inscrivez votre raisonnement dans le champ 'reason', et votre suggestion d'ajustement dans le champ 'adjustmentSuggestion'. Si vous suggérez une quantité à réduire, indiquez-la dans le champ 'suggestedQuantity'.
`,
});

const stockAdjustmentFlow = ai.defineFlow(
  {
    name: 'stockAdjustmentFlow',
    inputSchema: StockAdjustmentInputSchema,
    outputSchema: StockAdjustmentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
