// Shared types for AIWS Prototype

export interface VisualCommand {
  text: string;
  context: ElementContext;
  timestamp: number;
}

export interface ElementContext {
  element: ElementInfo;
  parent?: ElementInfo;
  siblings?: ElementInfo[];
  dataBindings?: DataBinding;
  eventListeners?: string[];
  page: string;
  viewport: Viewport;
}

export interface ElementInfo {
  tagName: string;
  id?: string;
  classes: string[];
  textContent?: string;
  styles?: Record<string, string>;
  position?: DOMRect;
  xpath: string;
}

export interface Viewport {
  width: number;
  height: number;
}

export interface DataBinding {
  query?: string;
  model?: string;
  field?: string;
}

export interface AgentResponse {
  success: boolean;
  message: string;
  changes?: any;
  duration?: number;
  agent: string;
}

export interface AIQQuery {
  name: string;
  intent: string;
  operation: 'FETCH' | 'INSERT' | 'UPDATE' | 'DELETE' | 'GRAPH_TRAVERSE';
  target: string;
  where?: Record<string, any>;
  compute?: Record<string, ComputeExpression>;
  filter?: Record<string, any>;
  sort?: SortExpression;
  limit?: number;
}

export interface ComputeExpression {
  function: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
  field?: string;
}

export interface SortExpression {
  field: string;
  order: 'ASC' | 'DESC';
}

export interface GraphNode {
  id: string | number;
  type: string;
  properties: Record<string, any>;
  edges: GraphEdge[];
  embedding?: number[];
}

export interface GraphEdge {
  relationship: string;
  target: string | number;
  weight?: number;
}

export interface AIBPMessage {
  magic: number; // 0xAIB1
  op: number;
  session: number;
  requestId: number;
  flags: number;
  payloadLength: number;
  payload: Buffer;
  checksum: number;
}

export enum AIBPOpCode {
  // User operations
  CREATE_USER = 0x01,
  UPDATE_USER = 0x02,
  DELETE_USER = 0x03,
  GET_USER = 0x04,
  LIST_USERS = 0x05,

  // Order operations
  CREATE_ORDER = 0x10,
  UPDATE_ORDER = 0x11,
  GET_ORDER = 0x12,

  // Query operations
  EXECUTE_QUERY = 0x20,
  GRAPH_TRAVERSE = 0x21,

  // WebSocket operations
  WS_SUBSCRIBE = 0x30,
  WS_UNSUBSCRIBE = 0x31,
  WS_BROADCAST = 0x32,

  // Responses
  SUCCESS = 0x80,
  ERROR = 0x81,
  CREATE_USER_RESPONSE = 0x81,
}

export interface ComponentDefinition {
  id: string;
  type: string;
  variants?: string[];
  sizes?: string[];
  bytecode?: string;
  template?: string;
  styles?: Record<string, any>;
}

export interface DesignSystem {
  colors: Record<string, string>;
  spacing: number[];
  fontSizes: string[];
  borderRadius: string[];
  shadows: string[];
}

export interface AgentTask {
  id: string;
  agent: 'design' | 'database' | 'api' | 'product';
  task: string;
  priority: 'low' | 'medium' | 'high';
  dependsOn?: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface UserStory {
  id: string;
  description: string;
  actor: string;
  action: string;
  object: string;
  goal: string;
  acceptanceCriteria: string[];
  tasks: AgentTask[];
}
