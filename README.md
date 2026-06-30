# Combat Tracker

A Dockerized full-stack D&D combat tracker.

## Run With Docker

```bash
docker compose up --build
```

Open http://localhost:3000.

The app stores quick-access characters and monsters in:

- `storage/characters.txt`
- `storage/monsters.txt`

The files are mounted into the container by `docker-compose.yml`, so edits made through the app persist on your machine.

## API

- `GET /api/library` returns saved characters and monsters.
- `POST /api/library/:type` saves a character or monster. `type` is `character` or `monster`.
- `DELETE /api/library/:type/:id` removes a saved entry.
