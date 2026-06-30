# Combat Tracker

A Dockerized full-stack D&D combat tracker.

## Run With Docker

```bash
docker compose up --build
```

Open http://localhost:3000.

## Live Coding With Docker

```bash
docker compose -f docker-compose.yml -f docker-compose.watch.yml up --build
```

This bind-mounts `app.js`, `index.html`, `styles.css`, `server.js`, and `storage` into the container. Frontend changes refresh in the browser, and `server.js` restarts through a polling watcher that works reliably with Docker Desktop file mounts.

The app stores quick-access characters and monsters in:

- `storage/characters.txt`
- `storage/monsters.txt`

The files are mounted into the container by `docker-compose.yml`, so edits made through the app persist on your machine.

## API

- `GET /api/library` returns saved characters and monsters.
- `POST /api/library/:type` saves a character or monster. `type` is `character` or `monster`.
- `PUT /api/library/:type/:id` updates a saved entry.
- `DELETE /api/library/:type/:id` removes a saved entry.
