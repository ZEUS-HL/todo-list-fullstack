import crypto from 'node:crypto';

let tasks = globalThis.__taskflowTasks;

if (!tasks) {
  tasks = [
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
  globalThis.__taskflowTasks = tasks;
}

function sendJson(response, statusCode, body) {
  response.status(statusCode).json(body);
}

function getTaskId(request) {
  const url = new URL(request.url, `https://${request.headers.host}`);
  const match = url.pathname.match(/^\/api\/tasks\/(?<id>[^/]+)$/);
  return match?.groups?.id;
}

export default function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }

  if (request.url?.startsWith('/api/tasks') && request.method === 'GET') {
    sendJson(response, 200, tasks);
    return;
  }

  if (request.url?.startsWith('/api/tasks') && request.method === 'POST') {
    const title = request.body?.title?.trim();

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
    globalThis.__taskflowTasks = tasks;
    sendJson(response, 201, task);
    return;
  }

  const id = getTaskId(request);

  if (!id) {
    sendJson(response, 404, { message: 'Route not found.' });
    return;
  }

  const existingTask = tasks.find((task) => task.id === id);

  if (!existingTask) {
    sendJson(response, 404, { message: 'Task not found.' });
    return;
  }

  if (request.method === 'PATCH') {
    const nextTitle =
      typeof request.body?.title === 'string' ? request.body.title.trim() : existingTask.title;
    const nextCompleted =
      typeof request.body?.completed === 'boolean'
        ? request.body.completed
        : existingTask.completed;

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
    globalThis.__taskflowTasks = tasks;
    sendJson(response, 200, updatedTask);
    return;
  }

  if (request.method === 'DELETE') {
    tasks = tasks.filter((task) => task.id !== id);
    globalThis.__taskflowTasks = tasks;
    response.status(204).end();
    return;
  }

  sendJson(response, 405, { message: 'Method not allowed.' });
}
