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
import { getSuggestion } from './actions';
import { Loader2, Wand2, Lightbulb, PackageMinus, BrainCircuit } from 'lucide-react';
import type { StockAdjustmentOutput } from '@/ai/flows/stock-adjustment-suggestions';
import type { Drug } from '@/lib/types';

export default function AdjustmentsClientPage({ drugs }: { drugs: Drug[] }) {
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
      setError(e instanceof Error ? e.message : 'Une erreur inconnue est survenue.');
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
          <CardTitle>Suggestions d'ajustement de stock par IA</CardTitle>
          <CardDescription>
            Utilisez notre outil GenAI pour obtenir des suggestions intelligentes sur les ajustements de stock en fonction des dates d'expiration et des niveaux actuels.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Désignation</TableHead>
                <TableHead>Stock actuel</TableHead>
                <TableHead>Date d'expiration</TableHead>
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
                      Obtenir une suggestion
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
            <DialogTitle>Suggestion IA pour {selectedDrug?.designation}</DialogTitle>
            <DialogDescription>
              Basé sur un stock actuel de {selectedDrug?.currentStock} et une date d'expiration au {selectedDrug?.expiryDate}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {isLoading && (
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-muted-foreground">Analyse des données...</span>
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Erreur</AlertTitle>
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
                          <span>Réduction suggérée: <strong>{suggestion.suggestedQuantity} unités</strong></span>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
                <Alert variant="default">
                    <BrainCircuit className="h-4 w-4" />
                    <AlertTitle>Raisonnement</AlertTitle>
                    <AlertDescription>
                        {suggestion.reason}
                    </AlertDescription>
                </Alert>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleCloseDialog}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
