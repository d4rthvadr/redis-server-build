### Motivation

- What problem are you solving
- What is the technical approach taker

### Goals

- Respecting the RESP protocols implement a clone of how redis works and connect using a NC | Telnet service
- Any redis client in any language should be able to connect to this server
- Implement persistence for data stored using AOL or snapshots.
- Dockerize the application.

### Prerequisites

1. Nodejs (20.x)
2. Typescript installed globally.
3. Docker ( Optional)
4. Redis-cli

### Installations

1. Clone this repo. `git clone  https://github.com/your-username/redis-server.git`
2. Change into project director. `cd <project-name-dir>`
3. Install dependencies
4. Start server. `npm run start:dev`

### Quick start

Now that we have the server running on `http://${hostname }:${port}`. You can change or bump the port number by 3 if it is conflicting with an already registered port. Example change port `6389` in server.ts file.

### Technologies used

- Typescript
- Nodejs (Net library)

### Implementation
