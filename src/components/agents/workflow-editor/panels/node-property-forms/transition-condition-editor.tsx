'use client';

import { useMemo, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Hash, Search, MessageSquare, Check, Variable, AlertCircle, Brain, CheckCircle2, XCircle, Globe, Equal } from 'lucide-react';

// ========================================
// Types
// ========================================

/**
 * Transition condition types based on AGENT_JSON_SCHEMA.md
 */
export type TransitionConditionType =
  | 'timeout'
  | 'max_turns'
  | 'contains'
  | 'user_responded'
  | 'always'
  | 'variables_extracted'
  | 'extraction_failed'
  | 'variable_equals'
  | 'intent'
  | 'api_success'
  | 'api_failed'
  | 'api_status'
  | 'api_response_contains';

interface TransitionConditionConfig {
  type: TransitionConditionType;
  displayName: string;
  description: string;
  icon: React.ReactNode;
  hasParameter: boolean;
  parameterType?: 'number' | 'string' | 'variables' | 'variable_value_pair' | 'intent';
  parameterLabel?: string;
  parameterPlaceholder?: string;
  parameterSuffix?: string;
  isPatternBased: boolean;
  applicableTo: ('standard' | 'retrieve_variable' | 'api_call')[];
}

interface TransitionConditionEditorProps {
  condition: string;
  onChange: (condition: string) => void;
  nodeType?: 'standard' | 'retrieve_variable' | 'end_call' | 'api_call';
  availableIntents?: string[];
  availableVariables?: string[];
  className?: string;
}

// ========================================
// Configuration
// ========================================

const CONDITION_CONFIGS: TransitionConditionConfig[] = [
  {
    type: 'always',
    displayName: 'Always',
    description: 'Immediate transition',
    icon: <Check className="h-3.5 w-3.5" />,
    hasParameter: false,
    isPatternBased: true,
    applicableTo: ['standard', 'retrieve_variable'],
  },
  {
    type: 'user_responded',
    displayName: 'User Responded',
    description: 'After user speaks',
    icon: <MessageSquare className="h-3.5 w-3.5" />,
    hasParameter: false,
    isPatternBased: true,
    applicableTo: ['standard'],
  },
  {
    type: 'timeout',
    displayName: 'Timeout',
    description: 'After specified time',
    icon: <Clock className="h-3.5 w-3.5" />,
    hasParameter: true,
    parameterType: 'number',
    parameterLabel: 'Seconds',
    parameterPlaceholder: '10',
    parameterSuffix: 's',
    isPatternBased: true,
    applicableTo: ['standard', 'retrieve_variable'],
  },
  {
    type: 'max_turns',
    displayName: 'Max Turns',
    description: 'After N exchanges',
    icon: <Hash className="h-3.5 w-3.5" />,
    hasParameter: true,
    parameterType: 'number',
    parameterLabel: 'Turn Count',
    parameterPlaceholder: '5',
    isPatternBased: true,
    applicableTo: ['standard'],
  },
  {
    type: 'contains',
    displayName: 'Contains Keyword',
    description: 'If response contains keyword',
    icon: <Search className="h-3.5 w-3.5" />,
    hasParameter: true,
    parameterType: 'string',
    parameterLabel: 'Keyword',
    parameterPlaceholder: 'goodbye',
    isPatternBased: true,
    applicableTo: ['standard'],
  },
  {
    type: 'variables_extracted',
    displayName: 'Variables Extracted',
    description: 'All variables successfully extracted',
    icon: <Variable className="h-3.5 w-3.5" />,
    hasParameter: true,
    parameterType: 'variables',
    parameterLabel: 'Variable Names',
    parameterPlaceholder: 'name,email,phone',
    isPatternBased: true,
    applicableTo: ['retrieve_variable'],
  },
  {
    type: 'extraction_failed',
    displayName: 'Extraction Failed',
    description: 'Any variable missing or null',
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    hasParameter: true,
    parameterType: 'variables',
    parameterLabel: 'Variable Names',
    parameterPlaceholder: 'name,email,phone',
    isPatternBased: true,
    applicableTo: ['retrieve_variable'],
  },
  {
    type: 'variable_equals',
    displayName: 'Variable Equals',
    description: 'Deterministic variable comparison (~0ms)',
    icon: <Equal className="h-3.5 w-3.5" />,
    hasParameter: true,
    parameterType: 'variable_value_pair',
    parameterLabel: 'Variable & Expected Value',
    parameterPlaceholder: 'var_name=value',
    isPatternBased: true,
    applicableTo: ['standard', 'retrieve_variable'],
  },
  {
    type: 'intent',
    displayName: 'Intent Match',
    description: 'LLM intent classification (~100-150ms)',
    icon: <Brain className="h-3.5 w-3.5" />,
    hasParameter: true,
    parameterType: 'intent',
    parameterLabel: 'Intent ID',
    parameterPlaceholder: 'wants_help or no_match',
    isPatternBased: false,
    applicableTo: ['standard'],
  },
  // API Call specific conditions
  {
    type: 'api_success',
    displayName: 'API Success',
    description: 'API returned 2xx status',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    hasParameter: false,
    isPatternBased: true,
    applicableTo: ['api_call'],
  },
  {
    type: 'api_failed',
    displayName: 'API Failed',
    description: 'API error, timeout, or non-2xx',
    icon: <XCircle className="h-3.5 w-3.5" />,
    hasParameter: false,
    isPatternBased: true,
    applicableTo: ['api_call'],
  },
  {
    type: 'api_status',
    displayName: 'API Status Code',
    description: 'Match specific HTTP status',
    icon: <Hash className="h-3.5 w-3.5" />,
    hasParameter: true,
    parameterType: 'number',
    parameterLabel: 'Status Code',
    parameterPlaceholder: '404',
    isPatternBased: true,
    applicableTo: ['api_call'],
  },
  {
    type: 'api_response_contains',
    displayName: 'Response Contains',
    description: 'Response body contains text',
    icon: <Globe className="h-3.5 w-3.5" />,
    hasParameter: true,
    parameterType: 'string',
    parameterLabel: 'Search Text',
    parameterPlaceholder: 'error',
    isPatternBased: true,
    applicableTo: ['api_call'],
  },
];

// ========================================
// Parsing & Building
// ========================================

/**
 * Parse a condition string into type and parameter
 */
function parseCondition(condition: string): { type: TransitionConditionType; parameter: string } {
  if (!condition) {
    return { type: 'always', parameter: '' };
  }

  // Handle simple conditions without parameters
  const simpleConditions: TransitionConditionType[] = ['always', 'user_responded', 'api_success', 'api_failed'];
  if (simpleConditions.includes(condition as TransitionConditionType)) {
    return { type: condition as TransitionConditionType, parameter: '' };
  }

  // Handle parameterized conditions (format: type:parameter)
  const colonIndex = condition.indexOf(':');
  if (colonIndex === -1) {
    // Check if it's a known type without a parameter (e.g., just "timeout" without ":10s")
    const config = CONDITION_CONFIGS.find((c) => c.type === condition);
    if (config) {
      return { type: condition as TransitionConditionType, parameter: '' };
    }
    // Unknown format, treat as custom/always
    return { type: 'always', parameter: '' };
  }

  const type = condition.substring(0, colonIndex) as TransitionConditionType;
  let parameter = condition.substring(colonIndex + 1);

  // Remove 's' suffix for timeout
  if (type === 'timeout' && parameter.endsWith('s')) {
    parameter = parameter.slice(0, -1);
  }

  // Validate it's a known type
  const config = CONDITION_CONFIGS.find((c) => c.type === type);
  if (!config) {
    // Unknown type, return as-is with always type for fallback
    return { type: 'always', parameter: '' };
  }

  return { type, parameter };
}

/**
 * Build a condition string from type and parameter
 */
function buildCondition(type: TransitionConditionType, parameter: string): string {
  const config = CONDITION_CONFIGS.find((c) => c.type === type);

  if (!config || !config.hasParameter) {
    return type;
  }

  // Handle special suffix for timeout
  if (type === 'timeout' && parameter) {
    return `${type}:${parameter}s`;
  }

  return parameter ? `${type}:${parameter}` : type;
}

// ========================================
// Component
// ========================================

export function TransitionConditionEditor({
  condition,
  onChange,
  nodeType = 'standard',
  availableIntents = [],
  availableVariables = [],
  className,
}: TransitionConditionEditorProps) {
  // Parse current condition
  const { type: conditionType, parameter } = useMemo(() => parseCondition(condition), [condition]);

  // Get config for current type
  const currentConfig = useMemo(
    () => CONDITION_CONFIGS.find((c) => c.type === conditionType) || CONDITION_CONFIGS[0],
    [conditionType]
  );

  // Filter conditions by applicable node type
  const applicableConditions = useMemo(
    () =>
      CONDITION_CONFIGS.filter((config) =>
        config.applicableTo.includes(nodeType as 'standard' | 'retrieve_variable')
      ),
    [nodeType]
  );

  // Handle type change
  const handleTypeChange = useCallback(
    (newType: TransitionConditionType) => {
      const config = CONDITION_CONFIGS.find((c) => c.type === newType);
      if (config?.hasParameter) {
        // Keep parameter if same type category, otherwise clear
        const newCondition = buildCondition(newType, '');
        onChange(newCondition);
      } else {
        onChange(newType);
      }
    },
    [onChange]
  );

  // Handle parameter change
  const handleParameterChange = useCallback(
    (newParameter: string) => {
      const newCondition = buildCondition(conditionType, newParameter);
      onChange(newCondition);
    },
    [conditionType, onChange]
  );

  // Render parameter input based on type
  const renderParameterInput = () => {
    if (!currentConfig?.hasParameter) {
      return null;
    }

    switch (currentConfig.parameterType) {
      case 'number':
        return (
          <div className="mt-2">
            <Label className="text-xs text-muted-foreground">{currentConfig.parameterLabel}</Label>
            <div className="flex items-center gap-1 mt-1">
              <Input
                type="number"
                min="1"
                value={parameter}
                onChange={(e) => handleParameterChange(e.target.value)}
                placeholder={currentConfig.parameterPlaceholder}
                className="h-8 text-sm"
              />
              {currentConfig.parameterSuffix && (
                <span className="text-xs text-muted-foreground">{currentConfig.parameterSuffix}</span>
              )}
            </div>
          </div>
        );

      case 'string':
        return (
          <div className="mt-2">
            <Label className="text-xs text-muted-foreground">{currentConfig.parameterLabel}</Label>
            <Input
              type="text"
              value={parameter}
              onChange={(e) => handleParameterChange(e.target.value)}
              placeholder={currentConfig.parameterPlaceholder}
              className="h-8 text-sm mt-1"
            />
          </div>
        );

      case 'variables':
        return (
          <div className="mt-2">
            <Label className="text-xs text-muted-foreground">{currentConfig.parameterLabel}</Label>
            {availableVariables.length > 0 ? (
              <div className="space-y-2 mt-1">
                <div className="flex flex-wrap gap-1">
                  {availableVariables.map((variable) => {
                    const isSelected = parameter.split(',').includes(variable);
                    return (
                      <Badge
                        key={variable}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer text-xs"
                        onClick={() => {
                          const currentVars = parameter ? parameter.split(',') : [];
                          if (isSelected) {
                            handleParameterChange(currentVars.filter((v) => v !== variable).join(','));
                          } else {
                            handleParameterChange([...currentVars, variable].join(','));
                          }
                        }}
                      >
                        {variable}
                      </Badge>
                    );
                  })}
                </div>
                <Input
                  type="text"
                  value={parameter}
                  onChange={(e) => handleParameterChange(e.target.value)}
                  placeholder={currentConfig.parameterPlaceholder}
                  className="h-8 text-sm"
                />
              </div>
            ) : (
              <Input
                type="text"
                value={parameter}
                onChange={(e) => handleParameterChange(e.target.value)}
                placeholder={currentConfig.parameterPlaceholder}
                className="h-8 text-sm mt-1"
              />
            )}
            <p className="text-xs text-muted-foreground mt-1">Comma-separated variable names</p>
          </div>
        );

      case 'variable_value_pair': {
        const eqIndex = parameter.indexOf('=');
        const varName = eqIndex >= 0 ? parameter.substring(0, eqIndex) : parameter;
        const expectedValue = eqIndex >= 0 ? parameter.substring(eqIndex + 1) : '';

        const handleVarNameChange = (newVarName: string) => {
          handleParameterChange(expectedValue || eqIndex >= 0 ? `${newVarName}=${expectedValue}` : newVarName);
        };

        const handleExpectedValueChange = (newValue: string) => {
          handleParameterChange(`${varName}=${newValue}`);
        };

        return (
          <div className="mt-2 space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground">Variable Name</Label>
              {availableVariables.length > 0 ? (
                <Select
                  value={varName || '__custom__'}
                  onValueChange={(v) => handleVarNameChange(v === '__custom__' ? '' : v)}
                >
                  <SelectTrigger className="h-8 text-sm mt-1">
                    <SelectValue placeholder="Select variable" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVariables.map((v) => (
                      <SelectItem key={v} value={v}>
                        <span className="font-mono text-xs">{v}</span>
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">Custom...</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="text"
                  value={varName}
                  onChange={(e) => handleVarNameChange(e.target.value)}
                  placeholder="variable_name"
                  className="h-8 text-sm font-mono mt-1"
                />
              )}
              {availableVariables.length > 0 && (varName === '' || !availableVariables.includes(varName)) && (
                <Input
                  type="text"
                  value={varName}
                  onChange={(e) => handleVarNameChange(e.target.value)}
                  placeholder="custom_variable_name"
                  className="h-8 text-sm font-mono mt-1"
                />
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Expected Value</Label>
              <Input
                type="text"
                value={expectedValue}
                onChange={(e) => handleExpectedValueChange(e.target.value)}
                placeholder="expected_value"
                className="h-8 text-sm mt-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">Case-insensitive comparison.</p>
          </div>
        );
      }

      case 'intent':
        return (
          <div className="mt-2">
            <Label className="text-xs text-muted-foreground">{currentConfig.parameterLabel}</Label>
            {availableIntents.length > 0 ? (
              <Select value={parameter} onValueChange={handleParameterChange}>
                <SelectTrigger className="h-8 text-sm mt-1">
                  <SelectValue placeholder="Select intent" />
                </SelectTrigger>
                <SelectContent>
                  {availableIntents.map((intent) => (
                    <SelectItem key={intent} value={intent}>
                      {intent}
                    </SelectItem>
                  ))}
                  <SelectItem value="no_match">no_match (fallback)</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="text"
                value={parameter}
                onChange={(e) => handleParameterChange(e.target.value)}
                placeholder={currentConfig.parameterPlaceholder}
                className="h-8 text-sm mt-1"
              />
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Use <code className="text-xs bg-muted px-1 rounded">no_match</code> for fallback
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={className}>
      <Label className="text-xs">Condition Type</Label>
      <Select value={conditionType} onValueChange={(v) => handleTypeChange(v as TransitionConditionType)}>
        <SelectTrigger className="h-8 text-sm mt-1">
          <SelectValue>
            <div className="flex items-center gap-2">
              {currentConfig?.icon}
              <span>{currentConfig?.displayName}</span>
              {!currentConfig?.isPatternBased && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  LLM
                </Badge>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {applicableConditions.map((config) => (
            <SelectItem key={config.type} value={config.type}>
              <div className="flex items-center gap-2">
                {config.icon}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span>{config.displayName}</span>
                    {!config.isPatternBased && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        LLM
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{config.description}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Type-specific parameter input */}
      {renderParameterInput()}

      {/* Show current condition value for reference */}
      <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono text-muted-foreground">
        {condition || 'always'}
      </div>
    </div>
  );
}

// Export types and utilities
export { parseCondition, buildCondition, CONDITION_CONFIGS };
export type { TransitionConditionConfig };
