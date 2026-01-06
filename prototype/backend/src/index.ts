import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import bodyParser from 'body-parser';
import { GraphMemDB } from '@aiws/database';
import { AgentOrchestrator } from './AgentOrchestrator';
import { VisualCommand } from '@aiws/shared';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize database and orchestrator
const db = new GraphMemDB();
const orchestrator = new AgentOrchestrator(db);

// Seed database with sample data
seedDatabase(db);

// WebSocket connections
const clients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');
  clients.add(ws);

  ws.on('message', async (message: string) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'command') {
        const command: VisualCommand = data.command;
        const responses = await orchestrator.processCommand(command);

        // Send response back to client
        ws.send(
          JSON.stringify({
            type: 'response',
            responses
          })
        );

        // Broadcast changes to all clients
        if (responses.some(r => r.success && r.changes)) {
          broadcast({
            type: 'update',
            changes: responses.filter(r => r.changes).map(r => r.changes)
          });
        }
      }
    } catch (error: any) {
      ws.send(
        JSON.stringify({
          type: 'error',
          message: error.message
        })
      );
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
});

function broadcast(data: any) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// REST API endpoints
app.post('/ai/command', async (req, res) => {
  try {
    const command: VisualCommand = req.body;
    const responses = await orchestrator.processCommand(command);

    res.json({
      success: true,
      responses
    });

    // Broadcast to WebSocket clients
    if (responses.some(r => r.success && r.changes)) {
      broadcast({
        type: 'update',
        changes: responses.filter(r => r.changes).map(r => r.changes)
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.get('/ai/status', (req, res) => {
  res.json({
    success: true,
    agents: orchestrator.getAgentStatus(),
    database: db.getStats()
  });
});

app.post('/ai/query', async (req, res) => {
  try {
    const { query } = req.body;
    const dbAgent = orchestrator.getDatabaseAgent();
    const result = dbAgent.executeQuery(query);

    res.json({
      success: true,
      result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║   AIWS Prototype Server                           ║
║   AI-Native Web Development Platform              ║
╠═══════════════════════════════════════════════════╣
║   HTTP Server: http://localhost:${PORT}           ║
║   WebSocket:   ws://localhost:${PORT}             ║
╠═══════════════════════════════════════════════════╣
║   Agents Active:                                  ║
║   ✓ Design Agent (UI/UX)                         ║
║   ✓ Database Agent (GraphMemDB + AIQ)            ║
║   ✓ API Agent (Endpoints)                        ║
║   ✓ Product Agent (Requirements)                 ║
╠═══════════════════════════════════════════════════╣
║   Database: GraphMemDB                            ║
║   Nodes: ${db.getStats().totalNodes.toString().padEnd(37)}║
║   Cache: Active                                   ║
╚═══════════════════════════════════════════════════╝
  `);
});

function seedDatabase(db: GraphMemDB) {
  // Add sample users
  db.addNode({
    id: 1,
    type: 'user',
    properties: {
      name: 'Alice Smith',
      email: 'alice@example.com',
      status: 'active',
      created_at: new Date('2024-01-15')
    },
    edges: [
      { relationship: 'HAS_ORDER', target: 101 },
      { relationship: 'HAS_ORDER', target: 102 }
    ]
  });

  db.addNode({
    id: 2,
    type: 'user',
    properties: {
      name: 'Bob Johnson',
      email: 'bob@example.com',
      status: 'active',
      created_at: new Date('2024-02-20')
    },
    edges: [{ relationship: 'HAS_ORDER', target: 103 }]
  });

  // Add sample products
  db.addNode({
    id: 201,
    type: 'product',
    properties: {
      title: 'Laptop Pro',
      price: 1299,
      category: 'electronics',
      status: 'published'
    },
    edges: []
  });

  db.addNode({
    id: 202,
    type: 'product',
    properties: {
      title: 'Wireless Mouse',
      price: 29,
      category: 'electronics',
      status: 'published'
    },
    edges: []
  });

  // Add sample orders
  db.addNode({
    id: 101,
    type: 'order',
    properties: {
      user_id: 1,
      total: 1299,
      status: 'completed',
      created_at: new Date('2024-03-01')
    },
    edges: [{ relationship: 'CONTAINS', target: 201 }]
  });

  db.addNode({
    id: 102,
    type: 'order',
    properties: {
      user_id: 1,
      total: 29,
      status: 'completed',
      created_at: new Date('2024-03-15')
    },
    edges: [{ relationship: 'CONTAINS', target: 202 }]
  });

  db.addNode({
    id: 103,
    type: 'order',
    properties: {
      user_id: 2,
      total: 1299,
      status: 'pending',
      created_at: new Date('2024-04-01')
    },
    edges: [{ relationship: 'CONTAINS', target: 201 }]
  });

  console.log('✓ Database seeded with sample data');
}
