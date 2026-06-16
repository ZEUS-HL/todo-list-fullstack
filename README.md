# Taskflow

A clean full-stack to-do list app with a React frontend and Node API.

## Features

- Add tasks
- Edit task titles
- Delete tasks
- Mark tasks as completed
- Filter tasks by status
- Modern responsive interface

## Run Locally

Start the frontend and backend:

```bash
npm run dev
```

Or run it directly:

```bash
node server/index.js
```

Open `http://localhost:4000`.

The API runs on `http://localhost:4000/api`.

## API

- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
