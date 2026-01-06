import { BaseAgent } from './BaseAgent';
import { VisualCommand, AgentResponse } from '@aiws/shared';

export class DesignAgent extends BaseAgent {
  private designSystem = {
    colors: {
      blue: '#3b82f6',
      red: '#ef4444',
      green: '#10b981',
      yellow: '#f59e0b',
      purple: '#8b5cf6',
      orange: '#f97316'
    },
    spacing: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64],
    fontSizes: ['0.75rem', '0.875rem', '1rem', '1.125rem', '1.25rem', '1.5rem', '2rem'],
    borderRadius: ['0', '0.25rem', '0.5rem', '0.75rem', '1rem', '9999px']
  };

  constructor() {
    super('Design Agent', ['ui', 'ux', 'components', 'styling', 'layout']);
  }

  async handleCommand(command: VisualCommand): Promise<AgentResponse> {
    const startTime = Date.now();
    const intent = this.parseIntent(command.text);

    try {
      let result;

      switch (intent.action) {
        case 'modify':
          result = await this.modifyElement(command, intent);
          break;
        case 'create':
          result = await this.createElement(command, intent);
          break;
        case 'remove':
          result = await this.removeElement(command);
          break;
        default:
          result = {
            message: `Design agent doesn't understand: ${command.text}`
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

  private async modifyElement(command: VisualCommand, intent: any) {
    const styles: Record<string, string> = {};
    const text = command.text.toLowerCase();

    // Size modifications
    if (intent.entities.size === 'increase') {
      styles.fontSize = '1.25em';
      styles.padding = '1.2em';
    } else if (intent.entities.size === 'decrease') {
      styles.fontSize = '0.875em';
      styles.padding = '0.8em';
    }

    // Color modifications
    if (intent.entities.color) {
      const color = this.designSystem.colors[intent.entities.color as keyof typeof this.designSystem.colors];
      if (color) {
        styles.backgroundColor = color;
        styles.color = '#ffffff';
      }
    }

    // Alignment
    if (intent.entities.alignment === 'center') {
      styles.margin = '0 auto';
      styles.textAlign = 'center';
    }

    // Additional style keywords
    if (text.includes('bold')) {
      styles.fontWeight = '700';
    }
    if (text.includes('shadow')) {
      styles.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    }
    if (text.includes('rounded')) {
      styles.borderRadius = '0.5rem';
    }
    if (text.includes('hide')) {
      styles.display = 'none';
    }
    if (text.includes('show')) {
      styles.display = 'block';
    }

    return {
      message: `Updated element styles`,
      changes: {
        type: 'style_update',
        xpath: command.context.element.xpath,
        styles
      }
    };
  }

  private async createElement(command: VisualCommand, intent: any) {
    const text = command.text.toLowerCase();
    let componentType = 'div';
    let componentHTML = '';

    if (text.includes('button')) {
      componentType = 'button';
      componentHTML = `<button class="aiws-button">Click me</button>`;
    } else if (text.includes('input') || text.includes('text field')) {
      componentType = 'input';
      componentHTML = `<input type="text" class="aiws-input" placeholder="Enter text..." />`;
    } else if (text.includes('search')) {
      componentType = 'search';
      componentHTML = `
        <div class="aiws-search">
          <svg class="aiws-search-icon" width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input type="search" placeholder="Search..." class="aiws-search-input" />
        </div>
      `;
    } else if (text.includes('card')) {
      componentType = 'card';
      componentHTML = `
        <div class="aiws-card">
          <div class="aiws-card-header">Card Title</div>
          <div class="aiws-card-body">Card content goes here</div>
        </div>
      `;
    }

    return {
      message: `Created ${componentType} component`,
      changes: {
        type: 'element_add',
        parent: command.context.element.xpath,
        html: componentHTML,
        styles: this.getDefaultStyles(componentType)
      }
    };
  }

  private async removeElement(command: VisualCommand) {
    return {
      message: 'Element removed',
      changes: {
        type: 'element_remove',
        xpath: command.context.element.xpath
      }
    };
  }

  private getDefaultStyles(componentType: string): Record<string, string> {
    const baseStyles = {
      button: {
        padding: '0.5rem 1rem',
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        border: 'none',
        borderRadius: '0.375rem',
        cursor: 'pointer',
        fontSize: '1rem'
      },
      input: {
        padding: '0.5rem',
        border: '1px solid #d1d5db',
        borderRadius: '0.375rem',
        fontSize: '1rem',
        width: '100%'
      },
      search: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem',
        border: '1px solid #d1d5db',
        borderRadius: '0.375rem',
        backgroundColor: '#ffffff'
      },
      card: {
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        padding: '1rem',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }
    };

    return baseStyles[componentType as keyof typeof baseStyles] || {};
  }
}
