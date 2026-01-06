import { VisualCommand, ElementContext, ElementInfo } from '@aiws/shared';

class AiwsClient {
  private ws: WebSocket | null = null;
  private selectedElement: HTMLElement | null = null;
  private commandCount = 0;
  private readonly serverUrl = 'ws://localhost:3000';

  constructor() {
    this.connectWebSocket();
    this.setupEventListeners();
    this.loadData();
  }

  private connectWebSocket() {
    this.ws = new WebSocket(this.serverUrl);

    this.ws.onopen = () => {
      console.log('✓ Connected to AIWS server');
      this.addMessage('ai', '✓ Connected to AIWS server');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'response') {
        this.handleResponse(data.responses);
      } else if (data.type === 'update') {
        this.handleUpdate(data.changes);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.addMessage('ai', '❌ Connection error. Please start the backend server.');
    };

    this.ws.onclose = () => {
      console.log('Disconnected from server');
      this.addMessage('ai', '⚠️ Disconnected from server. Reconnecting...');
      setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  private setupEventListeners() {
    // Element selection
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // Ignore clicks on panel
      if (target.closest('#aiws-panel')) {
        return;
      }

      // Select element
      e.preventDefault();
      this.selectElement(target);
    });

    // Hover highlighting
    document.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#aiws-panel') && target !== this.selectedElement) {
        target.classList.add('highlight-element');
      }
    });

    document.addEventListener('mouseout', (e) => {
      const target = e.target as HTMLElement;
      target.classList.remove('highlight-element');
    });

    // Send button
    const sendBtn = document.getElementById('aiws-send');
    const input = document.getElementById('aiws-input') as HTMLInputElement;

    sendBtn?.addEventListener('click', () => this.sendCommand());
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendCommand();
      }
    });

    // Quick actions
    document.querySelectorAll('.quick-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const command = (e.target as HTMLElement).dataset.command;
        if (command) {
          this.sendCommand(command);
        }
      });
    });
  }

  private selectElement(element: HTMLElement) {
    // Remove previous selection
    if (this.selectedElement) {
      this.selectedElement.style.outline = '';
      this.selectedElement.style.outlineOffset = '';
    }

    // Select new element
    this.selectedElement = element;
    element.style.outline = '2px solid #667eea';
    element.style.outlineOffset = '2px';

    // Update panel
    this.updateSelectedInfo(element);
  }

  private updateSelectedInfo(element: HTMLElement) {
    const info = document.getElementById('selected-info');
    if (!info) return;

    const tagName = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
    const text = element.textContent?.slice(0, 50) || '';

    info.innerHTML = `
      <h4>Selected: ${tagName}${id}${classes}</h4>
      <p style="font-size: 0.85rem; color: #666;">
        ${text ? `Text: "${text}"` : 'No text content'}
      </p>
    `;
  }

  private sendCommand(commandText?: string) {
    const input = document.getElementById('aiws-input') as HTMLInputElement;
    const text = commandText || input.value.trim();

    if (!text) return;

    if (!this.selectedElement) {
      this.addMessage('ai', '⚠️ Please select an element first');
      return;
    }

    // Add user message
    this.addMessage('human', text);

    // Create command
    const command: VisualCommand = {
      text,
      context: this.getElementContext(this.selectedElement),
      timestamp: Date.now()
    };

    // Send to server
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'command',
        command
      }));

      this.commandCount++;
      this.updateStats();
    } else {
      this.addMessage('ai', '❌ Not connected to server');
    }

    // Clear input
    input.value = '';
  }

  private getElementContext(element: HTMLElement): ElementContext {
    const styles = window.getComputedStyle(element);

    return {
      element: {
        tagName: element.tagName,
        id: element.id,
        classes: Array.from(element.classList),
        textContent: element.textContent || undefined,
        styles: {
          fontSize: styles.fontSize,
          padding: styles.padding,
          backgroundColor: styles.backgroundColor,
          color: styles.color
        },
        xpath: this.getXPath(element)
      },
      page: window.location.pathname,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  private getXPath(element: HTMLElement): string {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }

    const parts: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 0;
      let sibling = current.previousSibling;

      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }

      const tagName = current.nodeName.toLowerCase();
      const part = index > 0 ? `${tagName}[${index + 1}]` : tagName;
      parts.unshift(part);

      current = current.parentElement;
    }

    return '/' + parts.join('/');
  }

  private handleResponse(responses: any[]) {
    for (const response of responses) {
      if (response.success) {
        this.addMessage('ai', `✅ ${response.agent}: ${response.message}`);

        if (response.changes) {
          this.applyChanges(response.changes);
        }
      } else {
        this.addMessage('ai', `❌ ${response.agent}: ${response.message}`);
      }
    }
  }

  private handleUpdate(changes: any[]) {
    for (const change of changes) {
      this.applyChanges(change);
    }
  }

  private applyChanges(change: any) {
    if (!change) return;

    switch (change.type) {
      case 'style_update':
        this.applyStyleUpdate(change);
        break;
      case 'element_add':
        this.addElement(change);
        break;
      case 'element_remove':
        this.removeElement(change);
        break;
    }
  }

  private applyStyleUpdate(change: any) {
    if (!this.selectedElement) return;

    const styles = change.styles || {};
    Object.assign(this.selectedElement.style, styles);

    // Flash effect
    this.selectedElement.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (this.selectedElement) {
        this.selectedElement.style.transition = '';
      }
    }, 300);
  }

  private addElement(change: any) {
    if (!change.html) return;

    const temp = document.createElement('div');
    temp.innerHTML = change.html;
    const newElement = temp.firstElementChild as HTMLElement;

    if (newElement && this.selectedElement) {
      if (change.styles) {
        Object.assign(newElement.style, change.styles);
      }
      this.selectedElement.appendChild(newElement);
    }
  }

  private removeElement(change: any) {
    if (this.selectedElement) {
      this.selectedElement.remove();
      this.selectedElement = null;
      this.updateSelectedInfo(document.body);
    }
  }

  private addMessage(type: 'human' | 'ai', text: string) {
    const messages = document.getElementById('chat-messages');
    if (!messages) return;

    const message = document.createElement('div');
    message.className = `message message-${type}`;
    message.textContent = text;

    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
  }

  private async loadData() {
    try {
      const response = await fetch('http://localhost:3000/ai/status');
      const data = await response.json();

      if (data.success) {
        this.updateStats(data.database.totalNodes);
        this.loadProducts();
        this.loadUsers();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  private async loadProducts() {
    try {
      const response = await fetch('http://localhost:3000/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            @QUERY get_products
            @INTENT "Get all published products"

            FETCH product {
              WHERE {
                status: published
              }
            }
          `
        })
      });

      const data = await response.json();
      if (data.success && data.result) {
        this.renderProducts(data.result);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }

  private async loadUsers() {
    try {
      const response = await fetch('http://localhost:3000/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            @QUERY get_users
            @INTENT "Get active users"

            FETCH user {
              WHERE {
                status: active
              }
            }
          `
        })
      });

      const data = await response.json();
      if (data.success && data.result) {
        this.renderUsers(data.result);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }

  private renderProducts(products: any[]) {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    grid.innerHTML = products.map(p => `
      <div class="product-card" data-product-id="${p.id}">
        <div class="product-title">${p.properties.title}</div>
        <div class="product-price">$${p.properties.price}</div>
        <div class="product-category">${p.properties.category}</div>
        <button class="btn btn-primary">Add to Cart</button>
      </div>
    `).join('');
  }

  private renderUsers(users: any[]) {
    const list = document.getElementById('user-list');
    if (!list) return;

    list.innerHTML = users.map(u => `
      <div class="product-card" data-user-id="${u.id}" style="margin-bottom: 10px;">
        <div class="product-title">${u.properties.name}</div>
        <div style="color: #666; font-size: 0.9rem;">${u.properties.email}</div>
        <div style="color: #10b981; font-size: 0.85rem; margin-top: 5px;">
          Status: ${u.properties.status}
        </div>
      </div>
    `).join('');
  }

  private updateStats(nodeCount?: number) {
    const nodeCountEl = document.getElementById('node-count');
    const commandCountEl = document.getElementById('command-count');

    if (nodeCount !== undefined && nodeCountEl) {
      nodeCountEl.textContent = nodeCount.toString();
    }

    if (commandCountEl) {
      commandCountEl.textContent = this.commandCount.toString();
    }
  }
}

// Initialize AIWS client
new AiwsClient();
