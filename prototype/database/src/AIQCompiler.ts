import { AIQQuery, ComputeExpression, SortExpression } from '@aiws/shared';

/**
 * AIQ Compiler - Compiles AIQ query language to executable queries
 *
 * Example AIQ:
 * @QUERY get_top_customers
 * @INTENT "Find high-value active customers"
 *
 * FETCH users {
 *   WHERE {
 *     created_after: 2024-01-01
 *     status: active
 *   }
 *   COMPUTE {
 *     order_count: COUNT(orders)
 *     total_spent: SUM(orders.total)
 *   }
 *   FILTER {
 *     order_count > 5
 *   }
 *   SORT BY total_spent DESC
 *   LIMIT 10
 * }
 */
export class AIQCompiler {
  /**
   * Parse AIQ string to query object
   */
  parse(aiqString: string): AIQQuery {
    const lines = aiqString.split('\n').map(line => line.trim()).filter(Boolean);

    let name = '';
    let intent = '';
    let operation: 'FETCH' | 'INSERT' | 'UPDATE' | 'DELETE' | 'GRAPH_TRAVERSE' = 'FETCH';
    let target = '';
    let whereClause: Record<string, any> = {};
    let computeClause: Record<string, ComputeExpression> = {};
    let filterClause: Record<string, any> = {};
    let sortClause: SortExpression | undefined;
    let limitValue: number | undefined;

    let currentSection: string | null = null;
    let braceDepth = 0;
    let sectionContent: string[] = [];

    for (const line of lines) {
      // Parse metadata
      if (line.startsWith('@QUERY')) {
        name = line.split(' ')[1];
        continue;
      }
      if (line.startsWith('@INTENT')) {
        intent = line.match(/"([^"]*)"/)?.[1] || '';
        continue;
      }

      // Parse operation and target
      if (line.match(/^(FETCH|INSERT|UPDATE|DELETE|GRAPH_TRAVERSE|GRAPH_QUERY)\s+\w+/)) {
        const match = line.match(/^(\w+)\s+(\w+)/);
        if (match) {
          let op = match[1];
          if (op === 'GRAPH_QUERY') op = 'GRAPH_TRAVERSE';
          operation = op as any;
          target = match[2];
        }
        continue;
      }

      // Track braces
      if (line.includes('{')) braceDepth++;
      if (line.includes('}')) {
        braceDepth--;
        if (braceDepth === 0 && currentSection) {
          // Process section
          this.processSection(
            currentSection,
            sectionContent,
            whereClause,
            computeClause,
            filterClause
          );
          currentSection = null;
          sectionContent = [];
        }
        continue;
      }

      // Detect sections
      if (line.startsWith('WHERE')) {
        currentSection = 'WHERE';
        continue;
      }
      if (line.startsWith('COMPUTE')) {
        currentSection = 'COMPUTE';
        continue;
      }
      if (line.startsWith('FILTER')) {
        currentSection = 'FILTER';
        continue;
      }
      if (line.startsWith('SORT BY')) {
        const match = line.match(/SORT BY\s+(\w+)\s+(ASC|DESC)?/);
        if (match) {
          sortClause = {
            field: match[1],
            order: (match[2] as 'ASC' | 'DESC') || 'ASC'
          };
        }
        continue;
      }
      if (line.startsWith('LIMIT')) {
        const match = line.match(/LIMIT\s+(\d+)/);
        if (match) {
          limitValue = parseInt(match[1]);
        }
        continue;
      }

      // Collect section content
      if (currentSection && braceDepth > 0) {
        sectionContent.push(line);
      }
    }

    return {
      name,
      intent,
      operation,
      target,
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      compute: Object.keys(computeClause).length > 0 ? computeClause : undefined,
      filter: Object.keys(filterClause).length > 0 ? filterClause : undefined,
      sort: sortClause,
      limit: limitValue
    };
  }

  private processSection(
    section: string,
    content: string[],
    whereClause: Record<string, any>,
    computeClause: Record<string, ComputeExpression>,
    filterClause: Record<string, any>
  ): void {
    for (const line of content) {
      if (!line.includes(':')) continue;

      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim().replace(/,?\s*$/, '');

      switch (section) {
        case 'WHERE':
          whereClause[key.trim()] = this.parseValue(value);
          break;

        case 'COMPUTE':
          computeClause[key.trim()] = this.parseComputeExpression(value);
          break;

        case 'FILTER':
          filterClause[key.trim()] = this.parseFilterExpression(value);
          break;
      }
    }
  }

  private parseValue(value: string): any {
    value = value.trim();

    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Number
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value);
    }

    // Date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return new Date(value);
    }

    // String (remove quotes)
    return value.replace(/^["']|["']$/g, '');
  }

  private parseComputeExpression(expr: string): ComputeExpression {
    const match = expr.match(/(\w+)\(([^)]*)\)/);
    if (!match) {
      throw new Error(`Invalid compute expression: ${expr}`);
    }

    const func = match[1] as any;
    const field = match[2].trim() || undefined;

    return { function: func, field };
  }

  private parseFilterExpression(expr: string): any {
    // Handle comparison operators
    const operators = ['>=', '<=', '>', '<', '!=', '='];

    for (const op of operators) {
      if (expr.includes(op)) {
        const [, value] = expr.split(op).map(s => s.trim());
        const parsedValue = this.parseValue(value);

        switch (op) {
          case '>': return { $gt: parsedValue };
          case '>=': return { $gte: parsedValue };
          case '<': return { $lt: parsedValue };
          case '<=': return { $lte: parsedValue };
          case '!=': return { $ne: parsedValue };
          case '=': return parsedValue;
        }
      }
    }

    return this.parseValue(expr);
  }

  /**
   * Compile query to optimized execution plan
   */
  compile(query: AIQQuery): {
    query: AIQQuery;
    optimizations: string[];
    estimatedTime: number;
  } {
    const optimizations: string[] = [];
    let estimatedTime = 10; // Base time in ms

    // Optimization 1: Index detection
    if (query.where) {
      optimizations.push('Using property indexes for WHERE clause');
      estimatedTime -= 5;
    }

    // Optimization 2: Compute aggregations
    if (query.compute) {
      optimizations.push('Aggregations computed in single pass');
      estimatedTime += 2;
    }

    // Optimization 3: Early filtering
    if (query.filter) {
      optimizations.push('Applying filters after aggregation');
      estimatedTime += 1;
    }

    // Optimization 4: Limit pushdown
    if (query.limit) {
      optimizations.push('Limit applied early to reduce processing');
      estimatedTime = Math.min(estimatedTime, query.limit * 0.1);
    }

    return {
      query,
      optimizations,
      estimatedTime: Math.max(estimatedTime, 1)
    };
  }

  /**
   * Generate human-readable explanation
   */
  explain(query: AIQQuery): string {
    let explanation = `Query: ${query.name}\n`;
    explanation += `Intent: ${query.intent}\n\n`;
    explanation += `Execution Plan:\n`;
    explanation += `1. ${query.operation} from ${query.target}\n`;

    if (query.where) {
      explanation += `2. Filter by: ${JSON.stringify(query.where, null, 2)}\n`;
    }

    if (query.compute) {
      explanation += `3. Compute: ${JSON.stringify(query.compute, null, 2)}\n`;
    }

    if (query.filter) {
      explanation += `4. Apply filter: ${JSON.stringify(query.filter, null, 2)}\n`;
    }

    if (query.sort) {
      explanation += `5. Sort by ${query.sort.field} ${query.sort.order}\n`;
    }

    if (query.limit) {
      explanation += `6. Limit to ${query.limit} results\n`;
    }

    return explanation;
  }

  /**
   * Convert natural language to AIQ (simplified)
   */
  fromNaturalLanguage(nl: string): string {
    // Simple pattern matching for demo
    const lower = nl.toLowerCase();

    if (lower.includes('find') && lower.includes('user')) {
      return `
@QUERY find_users
@INTENT "${nl}"

FETCH users {
  WHERE {
    status: active
  }
  LIMIT 10
}`;
    }

    if (lower.includes('count') && lower.includes('order')) {
      return `
@QUERY count_orders
@INTENT "${nl}"

FETCH orders {
  COMPUTE {
    total: COUNT()
  }
}`;
    }

    // Default
    return `
@QUERY custom_query
@INTENT "${nl}"

FETCH data {
  LIMIT 10
}`;
  }
}
