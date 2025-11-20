import { StandardNode } from './standard-node';
import { RetrieveVariableNode } from './retrieve-variable-node';
import { EndCallNode } from './end-call-node';

export { StandardNode, RetrieveVariableNode, EndCallNode };

// Node type registry for ReactFlow
export const nodeTypes = {
  standardNode: StandardNode,
  retrieveVariableNode: RetrieveVariableNode,
  endCallNode: EndCallNode,
};
