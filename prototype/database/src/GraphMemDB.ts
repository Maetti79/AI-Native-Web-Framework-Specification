import { GraphNode, GraphEdge, AIQQuery } from '@aiws/shared';

/**
 * GraphMemDB - AI-Native Hybrid Database
 * Combines Graph + Vector + Document + In-Memory storage
 */
export class GraphMemDB {
  private nodes: Map<string, GraphNode>;
  private typeIndex: Map<string, Set<string>>;
  private edgeIndex: Map<string, Set<string>>;
  private propertyIndex: Map<string, Map<any, Set<string>>>;
  private cache: Map<string, { data: any; ttl: number; timestamp: number }>;

  constructor() {
    this.nodes = new Map();
    this.typeIndex = new Map();
    this.edgeIndex = new Map();
    this.propertyIndex = new Map();
    this.cache = new Map();
  }

  /**
   * Add a node to the graph
   */
  addNode(node: GraphNode): void {
    const nodeId = String(node.id);
    this.nodes.set(nodeId, node);

    // Update type index
    if (!this.typeIndex.has(node.type)) {
      this.typeIndex.set(node.type, new Set());
    }
    this.typeIndex.get(node.type)!.add(nodeId);

    // Update property indexes
    for (const [key, value] of Object.entries(node.properties)) {
      if (!this.propertyIndex.has(key)) {
        this.propertyIndex.set(key, new Map());
      }
      const propIndex = this.propertyIndex.get(key)!;
      if (!propIndex.has(value)) {
        propIndex.set(value, new Set());
      }
      propIndex.get(value)!.add(nodeId);
    }

    // Update edge index
    for (const edge of node.edges) {
      const edgeKey = `${nodeId}:${edge.relationship}`;
      if (!this.edgeIndex.has(edgeKey)) {
        this.edgeIndex.set(edgeKey, new Set());
      }
      this.edgeIndex.get(edgeKey)!.add(String(edge.target));
    }
  }

  /**
   * Get a node by ID
   */
  getNode(id: string | number): GraphNode | undefined {
    return this.nodes.get(String(id));
  }

  /**
   * Get all nodes of a specific type
   */
  getNodesByType(type: string): GraphNode[] {
    const nodeIds = this.typeIndex.get(type);
    if (!nodeIds) return [];

    return Array.from(nodeIds)
      .map(id => this.nodes.get(id))
      .filter((node): node is GraphNode => node !== undefined);
  }

  /**
   * Find nodes by property value
   */
  findNodesByProperty(key: string, value: any): GraphNode[] {
    const propIndex = this.propertyIndex.get(key);
    if (!propIndex) return [];

    const nodeIds = propIndex.get(value);
    if (!nodeIds) return [];

    return Array.from(nodeIds)
      .map(id => this.nodes.get(id))
      .filter((node): node is GraphNode => node !== undefined);
  }

  /**
   * Graph traversal - follow relationships
   */
  traverse(
    startNodeId: string | number,
    relationships: string[],
    maxDepth: number = 2
  ): GraphNode[] {
    const visited = new Set<string>();
    const results: GraphNode[] = [];
    const queue: { nodeId: string; depth: number }[] = [
      { nodeId: String(startNodeId), depth: 0 }
    ];

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;

      if (visited.has(nodeId) || depth > maxDepth) continue;
      visited.add(nodeId);

      const node = this.nodes.get(nodeId);
      if (!node) continue;

      if (depth > 0) {
        results.push(node);
      }

      // Follow specified relationships
      for (const edge of node.edges) {
        if (relationships.includes(edge.relationship)) {
          queue.push({
            nodeId: String(edge.target),
            depth: depth + 1
          });
        }
      }
    }

    return results;
  }

  /**
   * Vector similarity search (simplified)
   */
  vectorSearch(
    queryEmbedding: number[],
    type?: string,
    limit: number = 10,
    threshold: number = 0.7
  ): GraphNode[] {
    let candidates = Array.from(this.nodes.values());

    if (type) {
      const nodeIds = this.typeIndex.get(type);
      if (!nodeIds) return [];
      candidates = Array.from(nodeIds)
        .map(id => this.nodes.get(id))
        .filter((node): node is GraphNode => node !== undefined);
    }

    // Calculate cosine similarity
    const similarities = candidates
      .filter(node => node.embedding)
      .map(node => ({
        node,
        similarity: this.cosineSimilarity(queryEmbedding, node.embedding!)
      }))
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities.map(item => item.node);
  }

  /**
   * Execute AIQ query
   */
  executeQuery(query: AIQQuery): any[] {
    const cacheKey = JSON.stringify(query);
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    let results: GraphNode[] = [];

    switch (query.operation) {
      case 'FETCH':
        results = this.executeFetch(query);
        break;
      case 'GRAPH_TRAVERSE':
        results = this.executeTraverse(query);
        break;
      default:
        throw new Error(`Unsupported operation: ${query.operation}`);
    }

    // Apply filters
    if (query.filter) {
      results = this.applyFilters(results, query.filter);
    }

    // Apply sorting
    if (query.sort) {
      results = this.applySort(results, query.sort);
    }

    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    // Apply compute expressions
    let finalResults: any[] = results;
    if (query.compute) {
      finalResults = this.applyCompute(results, query.compute);
    }

    // Cache results
    this.setCache(cacheKey, finalResults, 300000); // 5 min TTL

    return finalResults;
  }

  private executeFetch(query: AIQQuery): GraphNode[] {
    let results = this.getNodesByType(query.target);

    if (query.where) {
      for (const [key, value] of Object.entries(query.where)) {
        results = results.filter(node => node.properties[key] === value);
      }
    }

    return results;
  }

  private executeTraverse(query: AIQQuery): GraphNode[] {
    if (!query.where?.start) {
      throw new Error('GRAPH_TRAVERSE requires start node');
    }

    const relationships = query.where.path || [];
    return this.traverse(query.where.start, relationships);
  }

  private applyFilters(nodes: GraphNode[], filters: Record<string, any>): GraphNode[] {
    return nodes.filter(node => {
      for (const [key, condition] of Object.entries(filters)) {
        if (typeof condition === 'object') {
          // Handle operators like { $gt: 5, $lt: 10 }
          for (const [op, value] of Object.entries(condition)) {
            const nodeValue = node.properties[key] as any;
            const compareValue = value as any;
            switch (op) {
              case '$gt':
                if (!(nodeValue > compareValue)) return false;
                break;
              case '$gte':
                if (!(nodeValue >= compareValue)) return false;
                break;
              case '$lt':
                if (!(nodeValue < compareValue)) return false;
                break;
              case '$lte':
                if (!(nodeValue <= compareValue)) return false;
                break;
              case '$ne':
                if (!(nodeValue !== compareValue)) return false;
                break;
            }
          }
        } else {
          if (node.properties[key] !== condition) return false;
        }
      }
      return true;
    });
  }

  private applySort(nodes: GraphNode[], sort: any): GraphNode[] {
    const { field, order } = sort;
    return nodes.sort((a, b) => {
      const aVal = a.properties[field];
      const bVal = b.properties[field];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return order === 'DESC' ? -comparison : comparison;
    });
  }

  private applyCompute(nodes: GraphNode[], compute: Record<string, any>): any[] {
    const results: any = {};

    for (const [key, expr] of Object.entries(compute)) {
      const func = expr.function;
      const field = expr.field;

      switch (func) {
        case 'COUNT':
          results[key] = nodes.length;
          break;
        case 'SUM':
          results[key] = nodes.reduce(
            (sum, node) => sum + (node.properties[field] || 0),
            0
          );
          break;
        case 'AVG':
          results[key] =
            nodes.reduce((sum, node) => sum + (node.properties[field] || 0), 0) /
            nodes.length;
          break;
        case 'MIN':
          results[key] = Math.min(
            ...nodes.map(node => node.properties[field] || Infinity)
          );
          break;
        case 'MAX':
          results[key] = Math.max(
            ...nodes.map(node => node.properties[field] || -Infinity)
          );
          break;
      }
    }

    return [results];
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      ttl,
      timestamp: Date.now()
    });
  }

  /**
   * Get statistics
   */
  getStats(): any {
    return {
      totalNodes: this.nodes.size,
      nodesByType: Array.from(this.typeIndex.entries()).map(([type, ids]) => ({
        type,
        count: ids.size
      })),
      cacheSize: this.cache.size,
      indexes: {
        types: this.typeIndex.size,
        properties: this.propertyIndex.size,
        edges: this.edgeIndex.size
      }
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.nodes.clear();
    this.typeIndex.clear();
    this.edgeIndex.clear();
    this.propertyIndex.clear();
    this.cache.clear();
  }
}
