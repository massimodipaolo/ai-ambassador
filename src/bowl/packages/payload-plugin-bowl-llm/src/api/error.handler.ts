import { Response } from 'express';

export const errorHandler = (error: any, res: Response) => {
  const status = error && error.status ? error.status : 500;
  const message = error && error.message ? error.message : 'Unknown error';
  const exception = {
    ...(typeof error === 'object' ? error : {}),
    status,
    message,
  };
  res.status(exception.status).send(exception);
};
