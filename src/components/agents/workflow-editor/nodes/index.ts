import { StandardNode } from './standard-node';
import { RetrieveVariableNode } from './retrieve-variable-node';
import { EndCallNode } from './end-call-node';
import { AgentTransferNode } from './agent-transfer-node';

export { StandardNode, RetrieveVariableNode, EndCallNode, AgentTransferNode };

// Node type registry for ReactFlow
export const nodeTypes = {
  standardNode: StandardNode,
  retrieveVariableNode: RetrieveVariableNode,
  endCallNode: EndCallNode,
  agentTransferNode: AgentTransferNode,
};
