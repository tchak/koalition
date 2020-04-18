import {
  ValidationError,
  NotFoundError,
  DBError,
  UniqueViolationError,
  NotNullViolationError,
  ForeignKeyViolationError,
  CheckViolationError,
  DataError,
} from 'objection';

export interface ErrorResponse {
  status: number;
  type: 'json';
  body: {
    message: string;
    type: string;
    data: unknown;
  };
}

export function errorHandler(err: Error): ErrorResponse {
  const response: ErrorResponse = {
    status: 400,
    type: 'json',
    body: {
      message: err.message,
      type: 'UnknownError',
      data: {},
    },
  };

  if (err instanceof ValidationError) {
    switch (err.type) {
      case 'ModelValidation':
        Object.assign(response.body, {
          type: err.type,
          data: err.data,
        });
        break;
      case 'RelationExpression':
      case 'UnallowedRelation':
      case 'InvalidGraph':
        response.body.type = err.type;
        break;
      default:
        response.body.type = 'UnknownValidationError';
        break;
    }
  } else if (err instanceof NotFoundError) {
    response.status = 404;
    response.body.type = 'NotFound';
  } else if (err instanceof UniqueViolationError) {
    response.status = 409;
    Object.assign(response.body, {
      type: 'UniqueViolation',
      data: {
        columns: err.columns,
        table: err.table,
        constraint: err.constraint,
      },
    });
  } else if (err instanceof NotNullViolationError) {
    Object.assign(response.body, {
      type: 'NotNullViolation',
      data: {
        column: err.column,
        table: err.table,
      },
    });
  } else if (err instanceof ForeignKeyViolationError) {
    response.status = 409;
    Object.assign(response.body, {
      type: 'ForeignKeyViolation',
      data: {
        table: err.table,
        constraint: err.constraint,
      },
    });
  } else if (err instanceof CheckViolationError) {
    Object.assign(response.body, {
      type: 'CheckViolation',
      data: {
        table: err.table,
        constraint: err.constraint,
      },
    });
  } else if (err instanceof DataError) {
    response.body.type = 'InvalidData';
  } else if (err instanceof DBError) {
    response.status = 500;
    response.body.type = 'UnknownDatabaseError';
  } else {
    response.status = 500;
  }

  return response;
}
