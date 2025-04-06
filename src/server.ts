import net from "net";
import { logger } from "./utils/logger";
import { executeCommand, init, parseCommand } from "./core";

const port: number = 6379;
const hostname: string = "127.0.0.1";

const log = logger("server");
const server: net.Server = net.createServer();

server.on("connection", (socket: net.Socket) => {
  log.info("Client connected");

  socket.on("data", (data: Buffer<ArrayBufferLike>) => {
    let response;
    const reqData: string = data.toString();

    try {
      const { command, args } = parseCommand(reqData);

      response = executeCommand(command, args);

      log.info(response);
    } catch (e: any) {
      log.error(e.message);
      socket.write("-ERR\r\n");
      return;
    }

    socket.write(response);
  });

  socket.on("end", () => {
    log.info("Client disconnected");
  });
});

server.listen(port, hostname, () => {
  init();
  log.info(`Server running at http://${hostname}:${port}`);
});
