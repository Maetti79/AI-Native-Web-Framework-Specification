import { BaseAgent } from './BaseAgent';
import { VisualCommand, AgentResponse } from '@aiws/shared';
import { GraphMemDB, AIQCompiler } from '@aiws/database';

export class DatabaseAgent extends BaseAgent {
  private db: GraphMemDB;
  private compiler: AIQCompiler;

  constructor(db: GraphMemDB) {
    super('Database Agent', ['database', 'models', 'queries', 'logging']);
    this.db = db;
    this.compiler = new AIQCompiler();
  }

  async handleCommand(command: VisualCommand): Promise<AgentResponse> {
    const startTime = Date.now();
    const intent = this.parseIntent(command.text);

    try {
      let result;

      if (intent.action === 'update_data') {
        result = await this.modifyDataQuery(command, intent);
      } else if (intent.action === 'sort') {
        result = await this.addSorting(command, intent);
      } else if (intent.action === 'filter') {
        result = await this.addFiltering(command, intent);
      } else {
        result = {
          message: `Database agent processed: ${command.text}`
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

  private async modifyDataQuery(command: VisualCommand, intent: any) {
    const text = command.text.toLowerCase();
    let newBinding = '';

    // Detect what data to show
    if (text.includes('name')) {
      newBinding = 'user.name';
    } else if (text.includes('email')) {
      newBinding = 'user.email';
    } else if (text.includes('price')) {
      newBinding = 'product.price';
    } else if (text.includes('title')) {
      newBinding = 'product.title';
    }

    return {
      message: `Updated data binding to ${newBinding}`,
      changes: {
        type: 'data_update',
        xpath: command.context.element.xpath,
        data: {
          binding: newBinding
        }
      }
    };
  }

  private async addSorting(command: VisualCommand, intent: any) {
    const text = command.text.toLowerCase();
    let sortField = 'created_at';
    let sortOrder: 'ASC' | 'DESC' = 'DESC';

    if (text.includes('price')) sortField = 'price';
    if (text.includes('name')) sortField = 'name';
    if (text.includes('date')) sortField = 'created_at';

    if (text.includes('ascending') || text.includes('asc') || text.includes('oldest')) {
      sortOrder = 'ASC';
    }

    return {
      message: `Added sorting by ${sortField} ${sortOrder}`,
      changes: {
        type: 'query_update',
        sort: {
          field: sortField,
          order: sortOrder
        }
      }
    };
  }

  private async addFiltering(command: VisualCommand, intent: any) {
    const text = command.text.toLowerCase();
    const filters: Record<string, any> = {};

    if (text.includes('active')) {
      filters.status = 'active';
    }
    if (text.includes('published')) {
      filters.status = 'published';
    }

    return {
      message: `Added filtering: ${JSON.stringify(filters)}`,
      changes: {
        type: 'query_update',
        filter: filters
      }
    };
  }

  executeQuery(aiqString: string): any {
    const query = this.compiler.parse(aiqString);
    return this.db.executeQuery(query);
  }

  getDbStats(): any {
    return this.db.getStats();
  }
}
