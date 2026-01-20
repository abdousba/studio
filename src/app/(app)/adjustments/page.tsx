'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { drugs, type Drug } from '@/lib/data';
import { getSuggestion } from './actions';
import { Loader2, Wand2, Lightbulb, PackageMinus, BrainCircuit } from 'lucide-react';
import type { StockAdjustmentOutput } from '@/ai/flows/stock-adjustment-suggestions';

export default function AdjustmentsPage() {
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [suggestion, setSuggestion] = useState<StockAdjustmentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetSuggestion = async (drug: Drug) => {
    setSelectedDrug(drug);
    setSuggestion(null);
    setError(null);
    setIsLoading(true);

    try {
      const result = await getSuggestion({
        drugName: drug.designation,
        currentStock: drug.currentStock,
        expiryDate: drug.expiryDate,
      });
      setSuggestion(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setSelectedDrug(null);
    setSuggestion(null);
    setError(null);
    setIsLoading(false);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>AI Stock Adjustment Suggestions</CardTitle>
          <CardDescription>
            Use our GenAI tool to get smart suggestions on stock adjustments based on expiry dates and current levels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Designation</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drugs.map((drug) => (
                <TableRow key={drug.barcode}>
                  <TableCell className="font-medium">{drug.designation}</TableCell>
                  <TableCell>{drug.currentStock}</TableCell>
                  <TableCell>{drug.expiryDate}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleGetSuggestion(drug)}>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Get Suggestion
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedDrug} onOpenChange={(isOpen) => !isOpen && handleCloseDialog()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>AI Suggestion for {selectedDrug?.designation}</DialogTitle>
            <DialogDescription>
              Based on current stock of {selectedDrug?.currentStock} and expiry date of {selectedDrug?.expiryDate}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isLoading && (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-muted-foreground">Analyzing data...</span>
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {suggestion && (
              <div className="space-y-4">
                <Alert className="bg-primary/10 border-primary/50">
                  <Lightbulb className="h-4 w-4" />
                  <AlertTitle className="font-semibold">{suggestion.adjustmentSuggestion}</AlertTitle>
                  <AlertDescription>
                    {suggestion.suggestedQuantity && suggestion.suggestedQuantity > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                          <PackageMinus className="h-4 w-4"/>
                          <span>Suggested Reduction: <strong>{suggestion.suggestedQuantity} units</strong></span>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
                <Alert variant="default">
                    <BrainCircuit className="h-4 w-4" />
                    <AlertTitle>Reasoning</AlertTitle>
                    <AlertDescription>
                        {suggestion.reason}
                    </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleCloseDialog}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
