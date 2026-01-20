'use server';

import { 
  suggestStockAdjustment, 
  type StockAdjustmentInput, 
  type StockAdjustmentOutput 
} from '@/ai/flows/stock-adjustment-suggestions';

export async function getSuggestion(input: StockAdjustmentInput): Promise<StockAdjustmentOutput> {
  try {
    const result = await suggestStockAdjustment(input);
    return result;
  } catch (error) {
    console.error('AI suggestion failed:', error);
    // In a real app, you might want to return a more structured error
    throw new Error('Failed to get suggestion from AI model.');
  }
}
