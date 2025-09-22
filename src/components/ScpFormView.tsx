import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calculator, Eye, Edit3 } from 'lucide-react';
import { SCPSchema, Question } from '@/lib/scpSchemas';

interface ScpFormViewProps {
  schema: SCPSchema;
  onBack: () => void;
  mode?: 'view' | 'create' | 'edit';
  initialValues?: Record<string, number>;
  onSubmit?: (values: Record<string, number>) => void;
}

export function ScpFormView({ 
  schema, 
  onBack, 
  mode = 'view',
  initialValues = {},
  onSubmit 
}: ScpFormViewProps) {
  const [responses, setResponses] = useState<Record<string, number>>(initialValues);

  const handleResponseChange = (questionKey: string, value: number) => {
    setResponses(prev => ({
      ...prev,
      [questionKey]: value
    }));
  };

  const calculateTotal = () => {
    return Object.values(responses).reduce((sum, value) => sum + (value || 0), 0);
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit(responses);
    }
  };

  const canSubmit = mode !== 'view' && schema.questions.every(q => responses[q.key] !== undefined);
  const totalScore = calculateTotal();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              {mode === 'view' && <Eye className="h-6 w-6 mr-2" />}
              {mode === 'create' && <Edit3 className="h-6 w-6 mr-2" />}
              {mode === 'edit' && <Edit3 className="h-6 w-6 mr-2" />}
              {schema.title}
            </h1>
            <p className="text-muted-foreground">{schema.description}</p>
          </div>
        </div>
        
        {totalScore > 0 && (
          <Card className="bg-muted">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{totalScore}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Avaliação {schema.title}</span>
            <Badge variant="outline">
              {schema.questions.length} itens
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {schema.questions.map((question, index) => (
            <div key={question.key} className="space-y-3">
              <div className="flex items-start justify-between">
                <Label className="text-base font-medium leading-relaxed flex-1">
                  {question.text}
                </Label>
                {responses[question.key] && (
                  <Badge variant="secondary" className="ml-4">
                    {responses[question.key]} pontos
                  </Badge>
                )}
              </div>
              
              <RadioGroup
                value={responses[question.key]?.toString() || ''}
                onValueChange={(value) => handleResponseChange(question.key, parseInt(value))}
                disabled={mode === 'view'}
                className="space-y-2"
              >
                {question.options.map((option) => (
                  <div 
                    key={option.value} 
                    className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <RadioGroupItem
                      value={option.value.toString()}
                      id={`${question.key}-${option.value}`}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={`${question.key}-${option.value}`}
                      className="flex-1 cursor-pointer text-sm leading-relaxed"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              
              {index < schema.questions.length - 1 && (
                <Separator className="my-6" />
              )}
            </div>
          ))}
          
          {mode !== 'view' && (
            <div className="flex justify-end space-x-2 pt-6 border-t">
              <Button variant="outline" onClick={onBack}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {mode === 'create' ? 'Criar Avaliação' : 'Salvar Alterações'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}