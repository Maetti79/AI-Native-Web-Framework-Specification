import { VisualCommand, AgentResponse } from '@aiws/shared';
import { DesignAgent } from './agents/DesignAgent';
import { DatabaseAgent } from './agents/DatabaseAgent';
import { APIAgent } from './agents/APIAgent';
import { ProductAgent } from './agents/ProductAgent';
import { GraphMemDB } from '@aiws/database';

export class AgentOrchestrator {
  private designAgent: DesignAgent;
  private databaseAgent: DatabaseAgent;
  private apiAgent: APIAgent;
  private productAgent: ProductAgent;

  constructor(db: GraphMemDB) {
    this.designAgent = new DesignAgent();
    this.databaseAgent = new DatabaseAgent(db);
    this.apiAgent = new APIAgent();
    this.productAgent = new ProductAgent();
  }

  async processCommand(command: VisualCommand): Promise<AgentResponse[]> {
    const responses: AgentResponse[] = [];

    // Determine which agents should handle this command
    const agents = this.selectAgents(command.text);

    // Execute agents in parallel or sequence based on dependencies
    for (const agentName of agents) {
      let agent;
      switch (agentName) {
        case 'design':
          agent = this.designAgent;
          break;
        case 'database':
          agent = this.databaseAgent;
          break;
        case 'api':
          agent = this.apiAgent;
          break;
        case 'product':
          agent = this.productAgent;
          break;
        default:
          continue;
      }

      try {
        const response = await agent.handleCommand(command);
        responses.push(response);
      } catch (error: any) {
        responses.push({
          success: false,
          message: error.message,
          agent: agent.getName()
        });
      }
    }

    return responses;
  }

  private selectAgents(commandText: string): string[] {
    const lower = commandText.toLowerCase();
    const agents: string[] = [];

    // Design-related keywords
    if (
      lower.match(/\b(make|change|style|color|size|bigger|smaller|button|add|create|remove)\b/)
    ) {
      agents.push('design');
    }

    // Database-related keywords
    if (
      lower.match(/\b(show|display|data|sort|filter|query|database|name|email|price)\b/)
    ) {
      agents.push('database');
    }

    // API-related keywords
    if (lower.match(/\b(save|endpoint|api|create|update|delete|real-time)\b/)) {
      agents.push('api');
    }

    // Product-related keywords (high-level features)
    if (
      lower.match(/\b(feature|users need|add a|search|authentication|cart|checkout)\b/)
    ) {
      agents.push('product');
    }

    // Default to design if no match
    if (agents.length === 0) {
      agents.push('design');
    }

    return agents;
  }

  getAgentStatus(): any {
    return {
      design: {
        name: this.designAgent.getName(),
        specialization: this.designAgent.getSpecialization()
      },
      database: {
        name: this.databaseAgent.getName(),
        specialization: this.databaseAgent.getSpecialization(),
        stats: this.databaseAgent.getDbStats()
      },
      api: {
        name: this.apiAgent.getName(),
        specialization: this.apiAgent.getSpecialization(),
        endpoints: this.apiAgent.getEndpoints()
      },
      product: {
        name: this.productAgent.getName(),
        specialization: this.productAgent.getSpecialization(),
        userStories: this.productAgent.getUserStories()
      }
    };
  }

  getDatabaseAgent(): DatabaseAgent {
    return this.databaseAgent;
  }
}
