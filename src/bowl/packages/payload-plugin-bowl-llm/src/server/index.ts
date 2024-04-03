import { Express } from 'express';
import http from 'http';
import { Payload } from 'payload';
import { Server } from 'socket.io';

/**
 * install
 *
 * "socket.io": "^4.7.2",
 *
 * usage
 * const io = createSocket(app, payload);
 */

function createSocket(app: Express, payload: Payload) {
  const server = http.createServer(app);

  const io = new Server<
    ClientToServer,
    ServerToClient,
    InterServer,
    SocketData
  >(server, {
    cors: {
      origin: [],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.emit('emit', 'hello', '{ "message": "message" }');
    /*
    socket.emit("basicEmit", 1, "2", Buffer.from([3]));
    socket.emit("withAck", "4", (e) => {
      // e is inferred as number
    });
    */

    // works when broadcast to all
    // io.emit("noArg");

    // works when broadcasting to a room
    // io.to("room1").emit("basicEmit", 1, "2", Buffer.from([3]));
  });

  // prepareRequestForPayloadAuth
  /*
  io.engine.use((req: Request, res: Response, next): void => {
    // We need this stuff for payload JWT authentication to work properly.
    // Feel free to refactor this if any of the below referenced code doesn't
    // need this anymore or if you find a better way to add these to the request.
    // Required for: https://github.com/payloadcms/payload/blob/90720964953d392d85982052b3a4843a5450681e/src/auth/getExtractJWT.ts#L7
    (req as any).get = (req as any).get || ((key: string) => req.headers[key.toLowerCase()]);
    // Required for: https://github.com/payloadcms/payload/blob/90720964953d392d85982052b3a4843a5450681e/src/auth/strategies/jwt.ts#L27
    (req as any).payload = (req as any).payload || payload;
    next();
  });
  */

  /*
  io.engine.use(payload.authenticate);
  */

  /*
  // ensureUserIsAuthenticated
  io.use((socket, next): void => {
    const req = socket.request;
    console.log('req', req);
    if ((req as any).isUnauthenticated()) {
      next(new Error('not authorized'));
    } else {
      next();
    }
  });
  */

  return io;
}

interface ServerToClient {
  emit: (type: string, message: string) => void;
  noArg: () => void;
  basicEmit: (a: number, b: string, c: Buffer) => void;
  withAck: (d: string, callback: (e: number) => void) => void;
}

interface ClientToServer {
  hello: () => void;
}

interface InterServer {
  ping: () => void;
}

interface SocketData {
  type: string;
  message: string;
}

function createSocketServer(payload: Payload) {
  const io = new Server(1338, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('document_change', (data) => {
      socket.broadcast.emit('document_change', data);
    });

    socket.on('field_focus', (data) => {
      socket.broadcast.emit('field_focus', data);
    });

    socket.on('field_blur', (data) => {
      socket.broadcast.emit('field_blur', data);
    });
  });
}


