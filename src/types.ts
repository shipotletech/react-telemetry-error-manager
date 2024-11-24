export interface IUseTelemetryErrorManager<TError = {}> {
  getKey: (error: ExtendedError<TError>) => string;
  onFlush: (result: ErrorDictionary<TError>) => void | Promise<void>;
  maxSize?: number;
  flushInterval?: number;
  Storage?: IErrorStorage<TError>;
}

export interface IErrorStorage<TError> {
  setItem: (
    key: string,
    value: ErrorDictionary<TError>,
  ) => void | Promise<void>;
  getItem: (key: string) => string | null | Promise<string | null>;
  removeItem: (key: string) => void | Promise<void>;
  clear: () => void | Promise<void>;
  getStorageKey: () => string;
}

export type ExtendedError<T> = T & BaseErrorDetails;
export type ErrorDictionary<T> = {[key: string]: ExtendedError<T>};
export interface BaseErrorDetails {
  Name: string;
  StackTrace: string;
  Message: string;
  Occurence: number;
  Persistence: ErrorPersistence;
}
export enum ErrorPersistence {
  LOW = 1,
  HIGH = 3,
}
