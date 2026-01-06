import { BaseAgent } from './BaseAgent';
import { VisualCommand, AgentResponse, AgentTask, UserStory } from '@aiws/shared';

export class ProductAgent extends BaseAgent {
  private userStories: UserStory[];

  constructor() {
    super('Product Agent', ['requirements', 'user_stories', 'strategy']);
    this.userStories = [];
  }

  async handleCommand(command: VisualCommand): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      const userStory = this.parseUserStory(command.text);
      const tasks = this.generateTasks(userStory);

      this.userStories.push(userStory);

      return {
        success: true,
        message: `Created implementation plan with ${tasks.length} tasks`,
        changes: {
          type: 'user_story_created',
          userStory,
          tasks
        },
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

  private parseUserStory(text: string): UserStory {
    return {
      id: `us_${Date.now()}`,
      description: text,
      actor: 'user',
      action: this.extractAction(text),
      object: this.extractObject(text),
      goal: text,
      acceptanceCriteria: [],
      tasks: []
    };
  }

  private extractAction(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('search')) return 'search';
    if (lower.includes('filter')) return 'filter';
    if (lower.includes('save')) return 'save';
    if (lower.includes('view')) return 'view';
    return 'interact with';
  }

  private extractObject(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('product')) return 'products';
    if (lower.includes('user')) return 'users';
    if (lower.includes('order')) return 'orders';
    return 'data';
  }

  private generateTasks(userStory: UserStory): AgentTask[] {
    const tasks: AgentTask[] = [];
    const text = userStory.description.toLowerCase();

    // Generate tasks based on requirements
    if (text.includes('search')) {
      tasks.push({
        id: `task_${Date.now()}_1`,
        agent: 'database',
        task: 'Add search index',
        priority: 'high',
        status: 'pending'
      });
      tasks.push({
        id: `task_${Date.now()}_2`,
        agent: 'api',
        task: 'Create search endpoint',
        priority: 'high',
        dependsOn: [`task_${Date.now()}_1`],
        status: 'pending'
      });
      tasks.push({
        id: `task_${Date.now()}_3`,
        agent: 'design',
        task: 'Add search bar component',
        priority: 'medium',
        dependsOn: [`task_${Date.now()}_2`],
        status: 'pending'
      });
    }

    if (text.includes('filter')) {
      tasks.push({
        id: `task_${Date.now()}_4`,
        agent: 'design',
        task: 'Add filter UI',
        priority: 'medium',
        status: 'pending'
      });
      tasks.push({
        id: `task_${Date.now()}_5`,
        agent: 'database',
        task: 'Implement filter query',
        priority: 'high',
        status: 'pending'
      });
    }

    return tasks;
  }

  getUserStories(): UserStory[] {
    return this.userStories;
  }
}
