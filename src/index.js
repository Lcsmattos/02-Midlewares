const express = require('express');
const cors = require('cors');

const { v4: uuid, validate } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(request, response, next) {
  const { username } = request.headers;

  const userAccount = users.find((user) => user.username === username);

  if (!userAccount) {
    return response.status(404).json({ erro: `Account name ${username} not find` });
  }

  request.user = userAccount;

  return next();
}

function checksCreateTodosUserAvailability(request, response, next) {
  const { user } = request;

  if (user.pro || user.todos.length < 10) {
    return next();
  }
  if (!user.pro || user.todos.length >= 10) {
    return response.status(403);
  }

}

function checksTodoExists(request, response, next) {
  const { username } = request.headers;
  const { id } = request.params;

  const regexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;
  const IsIdUuid = regexExp.test(id);

  if (IsIdUuid === false) {
    return response.status(400).json({ erro: `${id} is not an uuid` });
  }

  const userExists = users.find((user) => user.username === username);

  if (!userExists) {
    return response.status(404).json({ erro: `Account name ${username} not find` });
  }

  const validateTodo = userExists.todos.find((todo) => todo.id === id);

  if (!validateTodo) {
    return response.status(404).json({ erro: `Todo ${id} not find or not exists` });
  }

  request.user = userExists;
  request.todo = validateTodo;

  return next();
}

function findUserById(request, response, next) {
  const { id } = request.params;

  const userExists = users.find((user) => user.id === id);

  if (!userExists) {
    return response.status(404).json({ erro: `User id:${id} not find` });
  }

  request.user = userExists;

  return next();
}

app.post('/users', (request, response) => {
  const { name, username } = request.body;

  const alreadyExistUser = users.some(
    (user) => user.username === username
  );

  if (alreadyExistUser) {
    return response.status(400).json({ error: `Account name ${username} already exists, choose a new one` });
  }

  const user = {
    id: uuid(),
    name,
    username,
    pro: false,
    todos: []
  }

  users.push(user);

  return response.status(201).send(user);
});

app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
  const { title, deadline } = request.body;
  const { user } = request;

  const newTodo = {
    id: uuidv4(),
    title,
    deadline: new Date(deadline),
    done: false,
    created_at: new Date()
  };

  user.todos.push(newTodo);

  return response.status(201).json(newTodo);
});

app.put('/todos/:id', checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch('/todos/:id/done', checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { user, todo } = request;

  const todoIndex = user.todos.indexOf(todo);

  if (todoIndex === -1) {
    return response.status(404).json({ error: 'Todo not found' });
  }

  user.todos.splice(todoIndex, 1);

  return response.status(204).send();
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};

