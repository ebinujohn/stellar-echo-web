import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAgentsList } from '@/lib/db/queries/calls';
import { createAgent } from '@/lib/db/queries/agents';
import { createAgentSchema, workflowConfigSchema } from '@/lib/validations/agents';
import { z } from 'zod';

export async function GET() {
  try {
    const session = await requireAuth();

    const agents = await getAgentsList(session.tenantId);

    return NextResponse.json({
      success: true,
      data: agents,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    // Validate agent metadata
    const agentData = createAgentSchema.parse(body);

    // Validate workflow config (if provided)
    const configJson = body.configJson || createDefaultWorkflowConfig(agentData.name);

    try {
      workflowConfigSchema.parse(configJson);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid workflow configuration',
            details: validationError.issues,
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Create agent with initial config version
    const newAgent = await createAgent(
      agentData,
      configJson,
      session.tenantId,
      session.email
    );

    return NextResponse.json({
      success: true,
      data: newAgent,
    }, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: error.issues
        },
        { status: 400 }
      );
    }

    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Create a default workflow configuration for a new agent
 */
function createDefaultWorkflowConfig(agentName: string) {
  return {
    agent: {
      id: agentName.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
      name: agentName,
      description: '',
      version: '1.0.0',
    },
    workflow: {
      initial_node: 'greeting',
      global_prompt: 'You are a helpful AI assistant.',
      history_window: 0,
      max_transitions: 50,
      interruption_settings: {
        enabled: true,
        delay_ms: 300,
        resume_prompt: 'Go ahead',
      },
      nodes: [
        {
          id: 'greeting',
          type: 'standard',
          name: 'Greeting',
          system_prompt: 'Greet the user warmly and ask how you can help them today.',
          transitions: [
            {
              condition: 'contains:goodbye',
              target: 'end_call',
              priority: 10,
            },
          ],
        },
        {
          id: 'end_call',
          type: 'end_call',
          name: 'End Call',
        },
      ],
    },
    llm: {
      enabled: true,
      model: 'gpt-4o-mini',
      temperature: 0.8,
      max_tokens: 150,
    },
    tts: {
      enabled: true,
      model: 'eleven_turbo_v2_5',
      stability: 0.5,
      similarity_boost: 0.75,
    },
    stt: {
      model: 'flux-general-en',
      sample_rate: 8000,
    },
    auto_hangup: {
      enabled: true,
    },
    logging: {
      level: 'INFO',
    },
  };
}
