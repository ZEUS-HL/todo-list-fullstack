import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const PORT = process.env.PORT || 4000;
const ROOT_DIR = normalize(fileURLToPath(new URL('../', import.meta.url)));
const PUBLIC_DIR = normalize(fileURLToPath(new URL('../src/', import.meta.url)));

let tasks = [
  {
    id: crypto.randomUUID(),
    title: 'Plan the day',
    completed: false,
    createdAt: new Date().toISOString()
  },
  {
    id: crypto.randomUUID(),
    title: 'Review project tasks',
    completed: true,
    createdAt: new Date().toISOString()
  }
];

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8'
  });
  response.end(JSON.stringify(body));
}

function sendNoContent(response) {
  response.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
  response.end();
}

function getRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', (chunk) => {
      body += chunk;
    });

    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    request.on('error', reject);
  });
}

async function handleApi(request, response, url) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Origin': '*'
    });
    response.end();
    return;
  }

  if (url.pathname === '/api/health' && request.method === 'GET') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  if (url.pathname === '/api/tasks' && request.method === 'GET') {
    sendJson(response, 200, tasks);
    return;
  }

  if (url.pathname === '/api/tasks' && request.method === 'POST') {
    const body = await getRequestBody(request);
    const title = body?.title?.trim();

    if (!title) {
      sendJson(response, 400, { message: 'Task title is required.' });
      return;
    }

    const task = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: new Date().toISOString()
    };

    tasks = [task, ...tasks];
    sendJson(response, 201, task);
    return;
  }

  const taskMatch = url.pathname.match(/^\/api\/tasks\/(?<id>[^/]+)$/);

  if (!taskMatch) {
    sendJson(response, 404, { message: 'Route not found.' });
    return;
  }

  const { id } = taskMatch.groups;
  const existingTask = tasks.find((task) => task.id === id);

  if (!existingTask) {
    sendJson(response, 404, { message: 'Task not found.' });
    return;
  }

  if (request.method === 'PATCH') {
    const body = await getRequestBody(request);
    const nextTitle =
      typeof body?.title === 'string' ? body.title.trim() : existingTask.title;
    const nextCompleted =
      typeof body?.completed === 'boolean' ? body.completed : existingTask.completed;

    if (!nextTitle) {
      sendJson(response, 400, { message: 'Task title cannot be empty.' });
      return;
    }

    const updatedTask = {
      ...existingTask,
      title: nextTitle,
      completed: nextCompleted
    };

    tasks = tasks.map((task) => (task.id === id ? updatedTask : task));
    sendJson(response, 200, updatedTask);
    return;
  }

  if (request.method === 'DELETE') {
    tasks = tasks.filter((task) => task.id !== id);
    sendNoContent(response);
    return;
  }

  sendJson(response, 405, { message: 'Method not allowed.' });
}

async function handleStatic(request, response, url) {
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = normalize(
    pathname === '/index.html'
      ? fileURLToPath(new URL('../index.html', import.meta.url))
      : fileURLToPath(new URL(`..${pathname}`, import.meta.url))
  );

  if (filePath !== ROOT_DIR.slice(0, -1) && !filePath.startsWith(`${ROOT_DIR}`)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  try {
    const content = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream'
    });
    response.end(content);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url);
      return;
    }

    await handleStatic(request, response, url);
  } catch {
    sendJson(response, 500, { message: 'Server error.' });
  }
});

server.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
