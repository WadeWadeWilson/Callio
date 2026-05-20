const errorCodes = Object.freeze({
  OPERATION_CANCELED: 'OPERATION_CANCELED',
  IN_PROGRESS: 'ASYNC_OP_IN_PROGRESS',
  UNABLE_TO_OPEN_FILE_TYPE: 'UNABLE_TO_OPEN_FILE_TYPE',
  NULL_PRESENTER: 'NULL_PRESENTER',
});

const types = Object.freeze({
  allFiles: '*/*',
  audio: 'audio/*',
});

function pick() {
  const error = new Error('Document picker is mocked in Jest.');
  error.code = errorCodes.OPERATION_CANCELED;

  return Promise.reject(error);
}

function isErrorWithCode(error) {
  return Boolean(error && typeof error === 'object' && 'code' in error);
}

module.exports = {
  errorCodes,
  isErrorWithCode,
  pick,
  types,
};
