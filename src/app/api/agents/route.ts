import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAgentsList } from '@/lib/db/queries/calls';
import { createAgent } from '@/lib/db/queries/agents';
import { createAgentSchema, validateAgentConfig } from '@/lib/validations/agents';
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

    // Validate workflow config with enhanced validation
    // This provides structured errors and warnings
    const validationResult = validateAgentConfig(configJson);

    if (!validationResult.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid workflow configuration',
          details: validationResult.errors,
          warnings: validationResult.warnings,
        },
        { status: 400 }
      );
    }

    // Log warnings if any (config is valid but has deprecated patterns)
    if (validationResult.warnings.length > 0) {
      console.warn('Agent config warnings:', validationResult.warnings);
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
      warnings: validationResult.warnings.length > 0 ? validationResult.warnings : undefined,
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
 * Per AGENT_JSON_SCHEMA.md:
 * - LLM config is in workflow.llm section
 * - TTS config is in workflow.tts section (voice selection via voiceConfigId FK)
 * - STT is environment-based only
 * - RAG is database-backed via ragConfigId FK
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
      llm: {
        enabled: true,
        model_name: 'gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 150,
        service_tier: 'auto',
      },
      tts: {
        // TTS tuning params in workflow.tts per AGENT_JSON_SCHEMA.md
        // Voice selection is via voiceConfigId FK in database
        enabled: true,
        model: 'eleven_turbo_v2_5',
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
        enable_ssml_parsing: false,
        pronunciation_dictionaries_enabled: true,
        pronunciation_dictionary_ids: [],
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
    auto_hangup: {
      enabled: true,
    },
  };
}
