'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LucideIcon, Lightbulb } from 'lucide-react';

export interface EmptyStateAction {
  /** Button label */
  label: string;
  /** Click handler or href for Link */
  onClick?: () => void;
  /** If provided, renders as a Link */
  href?: string;
  /** Button icon */
  icon?: LucideIcon;
  /** Button variant */
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
}

export interface EmptyStateTip {
  /** Tip text */
  text: string;
}

export interface EmptyStateProps {
  /** Main icon to display */
  icon: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description: string;
  /** Primary action button */
  action?: EmptyStateAction;
  /** Secondary action button */
  secondaryAction?: EmptyStateAction;
  /** Helpful tips to display */
  tips?: EmptyStateTip[];
  /** Additional className for the container */
  className?: string;
  /** Whether to render inside a Card */
  asCard?: boolean;
  /** Icon color class (default: text-muted-foreground/50) */
  iconClassName?: string;
  /** Whether this is a compact variant */
  compact?: boolean;
}

/**
 * EmptyState component for displaying helpful messages when no data is available.
 * Features icons, descriptions, call-to-action buttons, and helpful tips.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  tips,
  className,
  asCard = true,
  iconClassName,
  compact = false,
}: EmptyStateProps) {
  const content = (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8' : 'py-12',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted',
          compact ? 'h-12 w-12' : 'h-16 w-16'
        )}
      >
        <Icon
          className={cn(
            compact ? 'h-6 w-6' : 'h-8 w-8',
            iconClassName || 'text-muted-foreground/70'
          )}
        />
      </div>

      {/* Title */}
      <h3 className={cn('mt-4 font-semibold', compact ? 'text-base' : 'text-lg')}>
        {title}
      </h3>

      {/* Description */}
      <p
        className={cn(
          'mt-2 text-muted-foreground',
          compact ? 'text-sm max-w-xs' : 'text-sm max-w-md'
        )}
      >
        {description}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className={cn('flex gap-3', compact ? 'mt-4' : 'mt-6')}>
          {action && <EmptyStateButton {...action} />}
          {secondaryAction && <EmptyStateButton {...secondaryAction} variant="outline" />}
        </div>
      )}

      {/* Tips */}
      {tips && tips.length > 0 && (
        <div className={cn('w-full max-w-md', compact ? 'mt-6' : 'mt-8')}>
          <div className="rounded-lg border border-dashed bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Lightbulb className="h-4 w-4" />
              <span>Tips</span>
            </div>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{tip.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );

  if (asCard) {
    return (
      <Card>
        <CardContent className="p-0">{content}</CardContent>
      </Card>
    );
  }

  return content;
}

/**
 * Internal button component for EmptyState actions
 */
function EmptyStateButton({
  label,
  onClick,
  href,
  icon: Icon,
  variant = 'default',
}: EmptyStateAction) {
  const ButtonContent = (
    <>
      {Icon && <Icon className="mr-2 h-4 w-4" />}
      {label}
    </>
  );

  if (href) {
    // Use native anchor for simplicity - can be wrapped with Link if needed
    return (
      <Button variant={variant} asChild>
        <a href={href}>{ButtonContent}</a>
      </Button>
    );
  }

  return (
    <Button variant={variant} onClick={onClick}>
      {ButtonContent}
    </Button>
  );
}

/**
 * Preset empty states for common scenarios
 */
export const emptyStatePresets = {
  agents: {
    icon: 'Bot' as const,
    title: 'No agents yet',
    description:
      'Create your first voice AI agent to start handling calls. Agents can be customized with workflows, knowledge bases, and voice settings.',
    tips: [
      { text: 'Start with a simple workflow and expand from there' },
      { text: 'Use global intents to handle common phrases across all nodes' },
      { text: 'Test your agent with the built-in chat feature before going live' },
    ],
  },
  ragConfigs: {
    icon: 'Database' as const,
    title: 'No RAG configurations',
    description:
      'RAG (Retrieval Augmented Generation) configurations enable your agents to access knowledge bases for accurate, contextual responses.',
    tips: [
      { text: 'Deploy knowledge bases from S3 for large document sets' },
      { text: 'Use hybrid search mode for best results' },
      { text: 'Adjust top_k to control how many documents are retrieved' },
    ],
  },
  voiceConfigs: {
    icon: 'Volume2' as const,
    title: 'No voices in catalog',
    description:
      'Add voices to your catalog to enable natural text-to-speech for your agents. Each agent can use a different voice.',
    tips: [
      { text: 'Choose voices that match your brand persona' },
      { text: 'Test voices with sample phrases before assigning to agents' },
    ],
  },
  phoneConfigs: {
    icon: 'Phone' as const,
    title: 'No phone numbers',
    description:
      'Add phone numbers to your pool and map them to agents for inbound and outbound call routing.',
    tips: [
      { text: 'Each phone number can be mapped to one agent' },
      { text: 'Use descriptive names to identify numbers easily' },
    ],
  },
  calls: {
    icon: 'PhoneOff' as const,
    title: 'No calls found',
    description:
      'No calls match your current filters. Try adjusting your search criteria or date range.',
    tips: [
      { text: 'Clear filters to see all calls' },
      { text: 'Check if agents are properly configured with phone numbers' },
    ],
  },
  noResults: {
    icon: 'SearchX' as const,
    title: 'No results found',
    description: 'Try adjusting your search terms or filters to find what you are looking for.',
  },
} as const;
