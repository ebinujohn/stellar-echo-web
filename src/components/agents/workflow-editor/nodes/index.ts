import { StandardNode } from './standard-node';
import { RetrieveVariableNode } from './retrieve-variable-node';
import { EndCallNode } from './end-call-node';
import { AgentTransferNode } from './agent-transfer-node';
import { ApiCallNode } from './api-call-node';

export { StandardNode, RetrieveVariableNode, EndCallNode, AgentTransferNode, ApiCallNode };

// Node type registry for ReactFlow
export const nodeTypes = {
  standardNode: StandardNode,
  retrieveVariableNode: RetrieveVariableNode,
  endCallNode: EndCallNode,
  agentTransferNode: AgentTransferNode,
  apiCallNode: ApiCallNode,
};
