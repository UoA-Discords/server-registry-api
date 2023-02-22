# src/middleware

Higher order functions that return middleware.

These middleware functions can be applied in 2 ways:

- Before the routes, this allows validation middleware to make sure a request is valid before reaching the handler, and to modify the request if needed.
- After the routes, this allows error handling middleware to catch any errors thrown by the handlers.


> Why higher order functions?

Some of the middleware requires contexts like the application config or database models, which are provided as parameters in the higher order function. Not all the middlewares need this, but they are all higher-order to keep things consistent.