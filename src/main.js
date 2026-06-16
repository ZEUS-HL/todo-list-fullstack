import React from 'react';
import { createRoot } from 'react-dom/client';

const API_URL = '/api/tasks';
const h = React.createElement;

function IconButton({ className = '', label, children, onClick }) {
  return h(
    'button',
    {
      className: `icon-button ${className}`.trim(),
      type: 'button',
      'aria-label': label,
      title: label,
      onClick
    },
    children
  );
}

function TaskApp() {
  const [tasks, setTasks] = React.useState([]);
  const [newTaskTitle, setNewTaskTitle] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [editingId, setEditingId] = React.useState(null);
  const [editingTitle, setEditingTitle] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadTasks();
  }, []);

  async function request(path = '', options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || 'Something went wrong.');
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async function loadTasks() {
    try {
      setIsLoading(true);
      setError('');
      setTasks(await request());
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function addTask(event) {
    event.preventDefault();
    const title = newTaskTitle.trim();

    if (!title) {
      return;
    }

    try {
      setError('');
      const task = await request('', {
        method: 'POST',
        body: JSON.stringify({ title })
      });
      setTasks((currentTasks) => [task, ...currentTasks]);
      setNewTaskTitle('');
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function updateTask(id, updates) {
    try {
      setError('');
      const updatedTask = await request(`/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === id ? updatedTask : task))
      );
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function deleteTask(id) {
    try {
      setError('');
      await request(`/${id}`, { method: 'DELETE' });
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== id));
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  function startEditing(task) {
    setEditingId(task.id);
    setEditingTitle(task.title);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingTitle('');
  }

  async function saveEditing(id) {
    const title = editingTitle.trim();

    if (!title) {
      return;
    }

    await updateTask(id, { title });
    cancelEditing();
  }

  const visibleTasks = tasks.filter((task) => {
    if (filter === 'active') {
      return !task.completed;
    }

    if (filter === 'completed') {
      return task.completed;
    }

    return true;
  });

  const completedCount = tasks.filter((task) => task.completed).length;
  const activeCount = tasks.length - completedCount;

  return h(
    'main',
    { className: 'app-shell' },
    h(
      'section',
      { className: 'todo-panel', 'aria-label': 'Task manager' },
      h(
        'div',
        { className: 'panel-header' },
        h('div', null, h('p', { className: 'eyebrow' }, 'Daily focus'), h('h1', null, 'Zeus task')),
        h(
          'div',
          { className: 'summary' },
          h('span', null, `${activeCount} active`),
          h('strong', null, `${completedCount} done`)
        )
      ),
      h(
        'form',
        { className: 'task-form', onSubmit: addTask },
        h('input', {
          'aria-label': 'New task',
          placeholder: 'Add a task...',
          value: newTaskTitle,
          onChange: (event) => setNewTaskTitle(event.target.value)
        }),
        h('button', { type: 'submit', 'aria-label': 'Add task', title: 'Add task' }, '+')
      ),
      h(
        'div',
        { className: 'filters', 'aria-label': 'Task filters' },
        ['all', 'active', 'completed'].map((option) =>
          h(
            'button',
            {
              className: filter === option ? 'is-selected' : '',
              key: option,
              type: 'button',
              onClick: () => setFilter(option)
            },
            option
          )
        )
      ),
      error ? h('p', { className: 'error' }, error) : null,
      h(
        'div',
        { className: 'task-list', 'aria-live': 'polite' },
        isLoading ? h('p', { className: 'empty-state' }, 'Loading tasks...') : null,
        !isLoading && visibleTasks.length === 0
          ? h('p', { className: 'empty-state' }, 'No tasks here yet.')
          : null,
        visibleTasks.map((task) => {
          const isEditing = editingId === task.id;

          return h(
            'article',
            { className: `task-item ${task.completed ? 'is-complete' : ''}`, key: task.id },
            h(
              IconButton,
              {
                className: 'status-button',
                label: task.completed ? 'Mark incomplete' : 'Mark complete',
                onClick: () => updateTask(task.id, { completed: !task.completed })
              },
              task.completed ? '[x]' : '[ ]'
            ),
            isEditing
              ? h('input', {
                  className: 'edit-input',
                  'aria-label': 'Edit task',
                  value: editingTitle,
                  onChange: (event) => setEditingTitle(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter') {
                      saveEditing(task.id);
                    }

                    if (event.key === 'Escape') {
                      cancelEditing();
                    }
                  },
                  autoFocus: true
                })
              : h('p', null, task.title),
            h(
              'div',
              { className: 'task-actions' },
              isEditing
                ? h(
                    IconButton,
                    { label: 'Cancel edit', onClick: cancelEditing },
                    'x'
                  )
                : h(
                    IconButton,
                    { label: 'Edit task', onClick: () => startEditing(task) },
                    'Edit'
                  ),
              h(
                IconButton,
                { className: 'danger', label: 'Delete task', onClick: () => deleteTask(task.id) },
                'Del'
              )
            )
          );
        })
      )
    )
  );
}

createRoot(document.getElementById('root')).render(h(TaskApp));
