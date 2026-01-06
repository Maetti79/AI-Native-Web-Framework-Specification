import { VisualCommand, AgentResponse } from '@aiws/shared';

export abstract class BaseAgent {
  protected name: string;
  protected specialization: string[];

  constructor(name: string, specialization: string[]) {
    this.name = name;
    this.specialization = specialization;
  }

  abstract handleCommand(command: VisualCommand): Promise<AgentResponse>;

  protected parseIntent(text: string): any {
    // Simple intent parsing - in production, this would use NLP/LLM
    const lower = text.toLowerCase();

    return {
      action: this.detectAction(lower),
      entities: this.extractEntities(lower),
      originalText: text
    };
  }

  private detectAction(text: string): string {
    if (text.includes('make') || text.includes('change')) return 'modify';
    if (text.includes('add') || text.includes('create')) return 'create';
    if (text.includes('remove') || text.includes('delete')) return 'remove';
    if (text.includes('show') || text.includes('display')) return 'update_data';
    if (text.includes('sort')) return 'sort';
    if (text.includes('filter')) return 'filter';
    return 'unknown';
  }

  private extractEntities(text: string): any {
    const entities: any = {};

    // Colors
    const colors = ['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'black', 'white'];
    for (const color of colors) {
      if (text.includes(color)) {
        entities.color = color;
      }
    }

    // Sizes
    if (text.includes('bigger') || text.includes('larger')) {
      entities.size = 'increase';
    }
    if (text.includes('smaller')) {
      entities.size = 'decrease';
    }

    // Alignment
    if (text.includes('center')) entities.alignment = 'center';
    if (text.includes('left')) entities.alignment = 'left';
    if (text.includes('right')) entities.alignment = 'right';

    return entities;
  }

  getName(): string {
    return this.name;
  }

  getSpecialization(): string[] {
    return this.specialization;
  }
}
