'use server';

/**
 * @fileOverview An AI agent to suggest stock adjustments based on inventory data.
 *
 * - suggestStockAdjustment - A function that suggests stock adjustments.
 * - StockAdjustmentInput - The input type for the suggestStockAdjustment function.
 * - StockAdjustmentOutput - The return type for the suggestStockAdjustment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StockAdjustmentInputSchema = z.object({
  drugName: z.string().describe('The name of the drug.'),
  currentStock: z.number().describe('The current stock level of the drug.'),
  expiryDate: z.string().describe('The expiry date of the drug (YYYY-MM-DD).'),
});
export type StockAdjustmentInput = z.infer<typeof StockAdjustmentInputSchema>;

const StockAdjustmentOutputSchema = z.object({
  adjustmentSuggestion: z
    .string()
    .describe(
      'A suggestion for adjusting the stock level, considering the expiry date and current stock.'
    ),
  suggestedQuantity: z
    .number()
    .optional()
    .describe('The suggested quantity to adjust the stock by.'),
  reason: z
    .string()
    .optional()
    .describe('The reason for the suggested adjustment.'),
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
  prompt: `You are an expert pharmacy manager. You will receive information about a drug, including its name, current stock level, and expiry date. Based on this information, you will suggest an adjustment to the stock level to minimize waste and ensure efficient resource allocation.

Drug Name: {{{drugName}}}
Current Stock: {{{currentStock}}}
Expiry Date: {{{expiryDate}}}

Consider the expiry date and current stock level to determine the optimal adjustment. If the expiry date is near, suggest reducing the stock level. If the stock level is low and the expiry date is far, suggest maintaining the stock level or increasing it if needed. Always provide a reason for your suggestion. Suggest also a quantity to reduce by if applicable. If the expiration date is far and the current stock is appropriate, just suggest maintaining the current stock.

Output your reasoning in the 'reason' field, and your suggestion for adjustment in the 'adjustmentSuggestion' field. If you are suggesting a quantity to reduce by, put that in the 'suggestedQuantity' field.
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
