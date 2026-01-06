import { BaseAgent } from './BaseAgent';
import { VisualCommand, AgentResponse } from '@aiws/shared';

export class APIAgent extends BaseAgent {
  private endpoints: Map<string, any>;

  constructor() {
    super('API Agent', ['api', 'endpoints', 'config', 'deployment']);
    this.endpoints = new Map();
  }

  async handleCommand(command: VisualCommand): Promise<AgentResponse> {
    const startTime = Date.now();
    const intent = this.parseIntent(command.text);

    try {
      let result;

      if (intent.action === 'create') {
        result = await this.createEndpoint(command, intent);
      } else {
        result = {
          message: `API agent processed: ${command.text}`
        };
      }

      return {
        success: true,
        message: result.message,
        changes: result.changes,
        duration: Date.now() - startTime,
        agent: this.name
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
        duration: Date.now() - startTime,
        agent: this.name
      };
    }
  }

  private async createEndpoint(command: VisualCommand, intent: any) {
    const text = command.text.toLowerCase();
    let endpointName = 'custom';
    let method = 'GET';

    if (text.includes('save') || text.includes('create')) {
      method = 'POST';
      endpointName = 'create';
    } else if (text.includes('update')) {
      method = 'PUT';
      endpointName = 'update';
    } else if (text.includes('delete')) {
      method = 'DELETE';
      endpointName = 'delete';
    }

    const endpoint = {
      method,
      path: `/api/v1/${endpointName}`,
      handler: `handle${endpointName.charAt(0).toUpperCase() + endpointName.slice(1)}`
    };

    this.endpoints.set(endpoint.path, endpoint);

    return {
      message: `Created ${method} endpoint: ${endpoint.path}`,
      changes: {
        type: 'endpoint_created',
        endpoint
      }
    };
  }

  getEndpoints(): any[] {
    return Array.from(this.endpoints.values());
  }
}
