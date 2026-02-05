'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { WorkflowNodeData } from '../../utils/json-converter';
import { TransitionConditionEditor } from './transition-condition-editor';
import { AutocompleteInput } from '@/components/ui/autocomplete-input';
import { useActionTypes } from '@/lib/hooks/use-workflow-config-types';

interface TargetNodeOption {
  id: string;
  name: string;
}

interface ApiCallNodeFormProps {
  nodeData: WorkflowNodeData;
  onUpdate: (updates: Partial<WorkflowNodeData>) => void;
  availableTargetNodes: TargetNodeOption[];
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface HeaderItem {
  key: string;
  value: string;
}

interface QueryParamItem {
  key: string;
  value: string;
}

interface ResponseExtraction {
  path: string;
  variable_name: string;
  default_value?: string;
}

export function ApiCallNodeForm({
  nodeData,
  onUpdate,
  availableTargetNodes,
}: ApiCallNodeFormProps) {
  // Basic info
  const [name, setName] = useState(nodeData.name || '');
  const [staticText, setStaticText] = useState(nodeData.static_text || '');

  // API Request config
  const [method, setMethod] = useState<HttpMethod>(nodeData.api_call?.method || 'GET');
  const [url, setUrl] = useState(nodeData.api_call?.url || '');
  const [headers, setHeaders] = useState<HeaderItem[]>(() => {
    const h = nodeData.api_call?.headers || {};
    return Object.entries(h).map(([key, value]) => ({ key, value }));
  });
  const [queryParams, setQueryParams] = useState<QueryParamItem[]>(() => {
    const q = nodeData.api_call?.query_params || {};
    return Object.entries(q).map(([key, value]) => ({ key, value }));
  });
  const [body, setBody] = useState(() => {
    const b = nodeData.api_call?.body;
    return b ? JSON.stringify(b, null, 2) : '';
  });

  // Response extraction
  const [extractions, setExtractions] = useState<ResponseExtraction[]>(
    nodeData.api_call?.response_extraction || []
  );

  // Timeout & Retry
  const [timeoutSeconds, setTimeoutSeconds] = useState(nodeData.api_call?.timeout_seconds ?? 30);
  const [maxRetries, setMaxRetries] = useState(nodeData.api_call?.retry?.max_retries ?? 2);
  const [initialDelayMs, setInitialDelayMs] = useState(nodeData.api_call?.retry?.initial_delay_ms ?? 500);
  const [maxDelayMs, setMaxDelayMs] = useState(nodeData.api_call?.retry?.max_delay_ms ?? 5000);
  const [backoffMultiplier, setBackoffMultiplier] = useState(nodeData.api_call?.retry?.backoff_multiplier ?? 2.0);

  // Security
  const [responseSizeLimit, setResponseSizeLimit] = useState(
    nodeData.api_call?.response_size_limit_bytes ?? 15000
  );
  const [allowedHosts, setAllowedHosts] = useState(
    (nodeData.api_call?.allowed_hosts || []).join(', ')
  );

  // Transitions
  const [transitions, setTransitions] = useState(nodeData.transitions || []);

  // On Entry Actions
  const [onEntryActions, setOnEntryActions] = useState<string[]>(
    nodeData.actions?.on_entry || []
  );

  // Collapsible states
  const [extractionOpen, setExtractionOpen] = useState(extractions.length > 0);
  const [timeoutRetryOpen, setTimeoutRetryOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);

  // Fetch workflow config types for autocomplete
  const { data: actionTypes = [], isLoading: actionsLoading } = useActionTypes();
  const actionSuggestions = actionTypes.map((a) => ({
    value: a.value,
    displayName: a.displayName,
    description: a.description,
    examples: a.examples,
    isPatternBased: a.isPatternBased,
  }));

  // Apply changes immediately
  useEffect(() => {
    // Build headers object
    const headersObj: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.key) headersObj[h.key] = h.value;
    });

    // Build query params object
    const queryParamsObj: Record<string, string> = {};
    queryParams.forEach((q) => {
      if (q.key) queryParamsObj[q.key] = q.value;
    });

    // Parse body JSON
    let bodyObj: Record<string, unknown> | undefined;
    if (body.trim()) {
      try {
        bodyObj = JSON.parse(body);
      } catch {
        // Invalid JSON, keep as undefined
      }
    }

    // Parse allowed hosts
    const allowedHostsArray = allowedHosts
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean);

    const updates: Partial<WorkflowNodeData> = {
      name,
      static_text: staticText || undefined,
      api_call: {
        method,
        url,
        ...(Object.keys(headersObj).length > 0 && { headers: headersObj }),
        ...(Object.keys(queryParamsObj).length > 0 && { query_params: queryParamsObj }),
        ...(bodyObj && { body: bodyObj }),
        timeout_seconds: timeoutSeconds,
        retry: {
          max_retries: maxRetries,
          initial_delay_ms: initialDelayMs,
          max_delay_ms: maxDelayMs,
          backoff_multiplier: backoffMultiplier,
        },
        ...(extractions.length > 0 && { response_extraction: extractions }),
        response_size_limit_bytes: responseSizeLimit,
        ...(allowedHostsArray.length > 0 && { allowed_hosts: allowedHostsArray }),
      },
      transitions,
      actions: {
        on_entry: onEntryActions.length > 0 ? onEntryActions : undefined,
      },
    };

    onUpdate(updates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    name,
    staticText,
    method,
    url,
    headers,
    queryParams,
    body,
    extractions,
    timeoutSeconds,
    maxRetries,
    initialDelayMs,
    maxDelayMs,
    backoffMultiplier,
    responseSizeLimit,
    allowedHosts,
    transitions,
    onEntryActions,
  ]);

  // Header management
  const addHeader = () => setHeaders([...headers, { key: '', value: '' }]);
  const updateHeader = (index: number, updates: Partial<HeaderItem>) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], ...updates };
    setHeaders(newHeaders);
  };
  const removeHeader = (index: number) => setHeaders(headers.filter((_, i) => i !== index));

  // Query param management
  const addQueryParam = () => setQueryParams([...queryParams, { key: '', value: '' }]);
  const updateQueryParam = (index: number, updates: Partial<QueryParamItem>) => {
    const newParams = [...queryParams];
    newParams[index] = { ...newParams[index], ...updates };
    setQueryParams(newParams);
  };
  const removeQueryParam = (index: number) => setQueryParams(queryParams.filter((_, i) => i !== index));

  // Extraction management
  const addExtraction = () =>
    setExtractions([...extractions, { path: '', variable_name: '', default_value: '' }]);
  const updateExtraction = (index: number, updates: Partial<ResponseExtraction>) => {
    const newExtractions = [...extractions];
    newExtractions[index] = { ...newExtractions[index], ...updates };
    setExtractions(newExtractions);
  };
  const removeExtraction = (index: number) => setExtractions(extractions.filter((_, i) => i !== index));

  // Transition management
  const addTransition = () => {
    setTransitions([
      ...transitions,
      { target: '', condition: 'api_success', priority: transitions.length },
    ]);
  };
  const updateTransition = (
    index: number,
    updates: Partial<{ target: string; condition: string; priority: number }>
  ) => {
    const newTransitions = [...transitions];
    newTransitions[index] = { ...newTransitions[index], ...updates };
    setTransitions(newTransitions);
  };
  const removeTransition = (index: number) => setTransitions(transitions.filter((_, i) => i !== index));

  // Action management
  const addOnEntryAction = () => setOnEntryActions([...onEntryActions, '']);
  const updateOnEntryAction = (index: number, value: string) => {
    const newActions = [...onEntryActions];
    newActions[index] = value;
    setOnEntryActions(newActions);
  };
  const removeOnEntryAction = (index: number) =>
    setOnEntryActions(onEntryActions.filter((_, i) => i !== index));

  const showBodyField = ['POST', 'PUT', 'PATCH'].includes(method);

  return (
    <div className="h-full overflow-y-auto [scrollbar-gutter:stable]">
      <div className="space-y-6 p-4">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="node-name">Node Name</Label>
            <Input
              id="node-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter node name"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Node ID</Label>
            <div className="text-sm text-muted-foreground font-mono mt-1.5">{nodeData.id}</div>
          </div>
        </div>

        <Separator />

        {/* Loading Message */}
        <div className="space-y-2">
          <Label htmlFor="loading-message">Loading Message (Optional)</Label>
          <Textarea
            id="loading-message"
            value={staticText}
            onChange={(e) => setStaticText(e.target.value)}
            placeholder="Please hold while I look that up..."
            className="min-h-[80px] text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Message spoken while waiting for API response
          </p>
        </div>

        <Separator />

        {/* API Request */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">API Request</Label>

          {/* Method */}
          <div>
            <Label className="text-xs">HTTP Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as HttpMethod)}>
              <SelectTrigger className="mt-1.5 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* URL */}
          <div>
            <Label className="text-xs">URL</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/endpoint"
              className="mt-1.5 h-8 text-sm font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Supports {'{{variable}}'} substitution
            </p>
          </div>

          {/* Headers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Headers ({headers.length})</Label>
              <Button variant="ghost" size="sm" onClick={addHeader} className="h-6 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            {headers.length > 0 && (
              <div className="space-y-2">
                {headers.map((header, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={header.key}
                      onChange={(e) => updateHeader(index, { key: e.target.value })}
                      placeholder="Header name"
                      className="h-7 text-xs flex-1"
                    />
                    <Input
                      value={header.value}
                      onChange={(e) => updateHeader(index, { value: e.target.value })}
                      placeholder="Value"
                      className="h-7 text-xs flex-1"
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeHeader(index)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Query Parameters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Query Parameters ({queryParams.length})</Label>
              <Button variant="ghost" size="sm" onClick={addQueryParam} className="h-6 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>
            {queryParams.length > 0 && (
              <div className="space-y-2">
                {queryParams.map((param, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={param.key}
                      onChange={(e) => updateQueryParam(index, { key: e.target.value })}
                      placeholder="Param name"
                      className="h-7 text-xs flex-1"
                    />
                    <Input
                      value={param.value}
                      onChange={(e) => updateQueryParam(index, { value: e.target.value })}
                      placeholder="Value"
                      className="h-7 text-xs flex-1"
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeQueryParam(index)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Body (only for POST/PUT/PATCH) */}
          {showBodyField && (
            <div>
              <Label className="text-xs">Request Body (JSON)</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder='{"key": "value"}'
                className="mt-1.5 min-h-[100px] font-mono text-xs"
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Response Extraction */}
        <Collapsible open={extractionOpen} onOpenChange={setExtractionOpen}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto gap-2">
                {extractionOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <Label className="cursor-pointer">Response Extraction ({extractions.length})</Label>
              </Button>
            </CollapsibleTrigger>
            <Button variant="outline" size="sm" onClick={addExtraction} className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>

          <CollapsibleContent className="space-y-3 mt-3">
            {extractions.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-3 border rounded-lg border-dashed">
                No extractions defined
              </div>
            ) : (
              extractions.map((extraction, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-2 bg-card">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Extraction {index + 1}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeExtraction(index)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div>
                    <Label className="text-xs">JSON Path</Label>
                    <Input
                      value={extraction.path}
                      onChange={(e) => updateExtraction(index, { path: e.target.value })}
                      placeholder="data.user.name"
                      className="mt-1 h-7 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Variable Name</Label>
                    <Input
                      value={extraction.variable_name}
                      onChange={(e) => updateExtraction(index, { variable_name: e.target.value })}
                      placeholder="user_name"
                      className="mt-1 h-7 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Default Value (Optional)</Label>
                    <Input
                      value={extraction.default_value || ''}
                      onChange={(e) => updateExtraction(index, { default_value: e.target.value })}
                      placeholder="Default if path not found"
                      className="mt-1 h-7 text-xs"
                    />
                  </div>
                </div>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Timeout & Retry */}
        <Collapsible open={timeoutRetryOpen} onOpenChange={setTimeoutRetryOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-auto gap-2">
              {timeoutRetryOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Label className="cursor-pointer">Timeout & Retry</Label>
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-3 mt-3 p-3 border rounded-lg bg-muted/50">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Timeout (seconds)</Label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={timeoutSeconds}
                  onChange={(e) => setTimeoutSeconds(parseInt(e.target.value) || 30)}
                  className="mt-1 h-7 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Max Retries</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(parseInt(e.target.value) || 0)}
                  className="mt-1 h-7 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Initial Delay (ms)</Label>
                <Input
                  type="number"
                  min="100"
                  max="60000"
                  value={initialDelayMs}
                  onChange={(e) => setInitialDelayMs(parseInt(e.target.value) || 500)}
                  className="mt-1 h-7 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">Max Delay (ms)</Label>
                <Input
                  type="number"
                  min="1000"
                  max="60000"
                  value={maxDelayMs}
                  onChange={(e) => setMaxDelayMs(parseInt(e.target.value) || 5000)}
                  className="mt-1 h-7 text-xs"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs">Backoff Multiplier</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  value={backoffMultiplier}
                  onChange={(e) => setBackoffMultiplier(parseFloat(e.target.value) || 2.0)}
                  className="mt-1 h-7 text-xs"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Security */}
        <Collapsible open={securityOpen} onOpenChange={setSecurityOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-auto gap-2">
              {securityOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Label className="cursor-pointer">Security</Label>
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-3 mt-3 p-3 border rounded-lg bg-muted/50">
            <div>
              <Label className="text-xs">Response Size Limit (bytes)</Label>
              <Input
                type="number"
                min="1000"
                max="50000"
                value={responseSizeLimit}
                onChange={(e) => setResponseSizeLimit(parseInt(e.target.value) || 15000)}
                className="mt-1 h-7 text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">Max: 50,000 bytes</p>
            </div>

            <div>
              <Label className="text-xs">Allowed Hosts</Label>
              <Input
                value={allowedHosts}
                onChange={(e) => setAllowedHosts(e.target.value)}
                placeholder="api.example.com, secure.site.com"
                className="mt-1 h-7 text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">Comma-separated list (empty = allow all)</p>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator />

        {/* Transitions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Transitions ({transitions.length})</Label>
            <Button variant="outline" size="sm" onClick={addTransition} className="h-8">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>

          {transitions.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
              No transitions defined. Add at least one.
            </div>
          ) : (
            <div className="space-y-3">
              {transitions.map((transition, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-3 bg-card">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Transition {index + 1}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeTransition(index)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div>
                    <Label className="text-xs">Target Node</Label>
                    <Select
                      value={transition.target}
                      onValueChange={(value) => updateTransition(index, { target: value })}
                    >
                      <SelectTrigger className="mt-1.5 h-8 text-sm">
                        <SelectValue placeholder="Select target node" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTargetNodes.map((node) => (
                          <SelectItem key={node.id} value={node.id}>
                            {node.name} ({node.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <TransitionConditionEditor
                    condition={transition.condition}
                    onChange={(value) => updateTransition(index, { condition: value })}
                    nodeType="api_call"
                  />

                  <div>
                    <Label className="text-xs">Priority</Label>
                    <Input
                      type="number"
                      value={transition.priority}
                      onChange={(e) =>
                        updateTransition(index, { priority: parseInt(e.target.value) || 0 })
                      }
                      className="mt-1.5 h-8 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* On Entry Actions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>On Entry Actions ({onEntryActions.length})</Label>
            <Button variant="outline" size="sm" onClick={addOnEntryAction} className="h-8">
              <Plus className="h-3 w-3 mr-1" />
              Add
            </Button>
          </div>

          {onEntryActions.length > 0 ? (
            <div className="space-y-2">
              {onEntryActions.map((action, index) => (
                <div key={index} className="flex items-center gap-2">
                  <AutocompleteInput
                    suggestions={actionSuggestions}
                    value={action}
                    onChange={(value) => updateOnEntryAction(index, value)}
                    placeholder="log:message, webhook:url"
                    className="h-8 text-sm flex-1"
                    isLoading={actionsLoading}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeOnEntryAction(index)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-2 border rounded-lg border-dashed">
              No on-entry actions defined
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
