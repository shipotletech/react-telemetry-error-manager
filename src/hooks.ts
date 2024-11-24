import {useCallback, useContext, useEffect, useRef} from 'react';
import {
  ErrorDictionary,
  IUseTelemetryErrorManager,
  ErrorPersistence,
  ExtendedError,
} from './types';
import sizeof from 'object-sizeof';
import {ErrorReportContext, ErrorReportContextType} from './providers';

/**
 * Provides access to the error reporting context.
 * Must be used within an `ErrorReportProvider`.
 *
 * @template TError - The type of the error object.
 * @returns {ErrorReportContextType<TError>} The error reporting context.
 * @throws Will throw an error if used outside of an `ErrorReportProvider`.
 */
export const useErrorAggregator = <TError>() => {
  const context = useContext<ErrorReportContextType<TError> | null>(
    ErrorReportContext,
  );

  if (!context) {
    throw new Error(
      'useErrorAggregator must be used within an ErrorReportProvider',
    );
  }

  return context;
};

/**
 * Custom hook to handle error reporting with a given configuration.
 * Manages adding errors to a queue and flushing events at regular intervals.
 *
 * @template TError - The type of the error object.
 * @param {IUseTelemetryErrorManager<TError>} config - Configuration object for error reporting.
 * @returns {Object} An object containing `handleReportError`, a function to report errors.
 */
export const useErrorReporter = <TError>(
  config: IUseTelemetryErrorManager<TError>,
) => {
  const {flushInterval} = config;
  const {addError, flushEvents} = useErrorQueueManager<TError>(config);

  /**
   * Handles reporting an error by adding it to the queue.
   *
   * @param {ExtendedError<TError>} error - The error to report.
   * @returns {Promise<void>} A promise that resolves when the error is added.
   */
  const handleReportError = async (error: ExtendedError<TError>) => {
    await addError(error);
  };
  useEffect(() => {
    // Set up an interval to flush events at the specified interval.
    const interval = setInterval(() => {
      flushEvents();
    }, flushInterval ?? 60 * 1000);
    // Clear the interval on component unmount.
    return () => clearInterval(interval);
  }, [flushEvents, flushInterval]);
  return {handleReportError};
};

/**
 * Custom hook to manage error queue operations, including adding errors and flushing events.
 *
 * @template TError - The type of the error object.
 * @param {IUseTelemetryErrorManager<TError>} config - Configuration object for error management.
 * @returns {Object} An object containing `flushEvents` and `addError` functions.
 */
const useErrorQueueManager = <TError>(
  config: IUseTelemetryErrorManager<TError>,
) => {
  const {getKey, onFlush, Storage, maxSize} = config;
  const maxAllowedSize = maxSize ?? 10 * 1024 * 1024;

  /**
   * A mutable reference object to store the current mapping of errors in memory.
   *
   * This reference is used to maintain an up-to-date in-memory mapping of errors,
   * allowing for efficient addition, updating, and retrieval of errors without causing
   * unnecessary re-renders. It is managed by the `useErrorQueueManager` hook and is
   * updated as errors are added or flushed.
   *
   * @type {ErrorDictionary<TError>} - The current mapping of error objects, where the key is a string
   *                                    (typically a unique identifier for the error) and the value
   *                                    is an `ExtendedError<TError>` object.
   */
  const errorMappingRef = useRef<ErrorDictionary<TError>>({});

  /**
   * Updates the error mapping stored in local memory with a new error.
   *
   * @param {ExtendedError<TError>} error - The error to update.
   * @returns {Promise<void>} A promise that resolves when the update is complete.
   */
  const updateMappingInLocalMemory = useCallback(
    async (error: ExtendedError<TError>) => {
      if (!Storage) {
        return;
      }
      const {getItem, setItem, getStorageKey} = Storage;
      const storageKey = getStorageKey();
      const errorMappingKey = getKey(error);
      const stringifiedPersistedErrors = await getItem(storageKey);
      if (!stringifiedPersistedErrors) {
        await setItem(storageKey, {[errorMappingKey]: error});
        return;
      }
      const persistedErrors: ErrorDictionary<TError> = JSON.parse(
        stringifiedPersistedErrors,
      );
      if (persistedErrors.hasOwnProperty(errorMappingKey)) {
        persistedErrors[errorMappingKey].Occurence++;
      } else {
        persistedErrors[errorMappingKey] = error;
      }
      await setItem(storageKey, persistedErrors);
    },
    [Storage, getKey],
  );

  /**
   * Updates the in-memory error mapping from local storage.
   * Merges persisted errors with the current in-memory errors.
   *
   * @returns {Promise<void>} A promise that resolves when the update is complete.
   */
  const updateErrorMappingFromLocalMemoryToInMemory = useCallback(async () => {
    if (!Storage) {
      return;
    }
    const {getItem, getStorageKey} = Storage;
    const storageKey = getStorageKey();
    const stringifiedPersistedErrors = await getItem(storageKey);
    if (!stringifiedPersistedErrors) {
      return;
    }
    const persistedErrors: ErrorDictionary<TError> = JSON.parse(
      stringifiedPersistedErrors,
    );
    Object.keys(persistedErrors).forEach(k => {
      if (errorMappingRef.current.hasOwnProperty(k)) {
        errorMappingRef.current[k].Occurence++;
      } else {
        errorMappingRef.current[k] = persistedErrors[k];
      }
    });
  }, [Storage]);

  /**
   * Clears all error mappings from local memory.
   *
   * @returns {Promise<void>} A promise that resolves when the local memory is cleared.
   */
  const clearLocalMemory = useCallback(async () => {
    if (!Storage) {
      return;
    }
    const {removeItem, getStorageKey} = Storage;
    const storageKey = getStorageKey();
    await removeItem(storageKey);
  }, [Storage]);

  /**
   * Flushes all current errors from the queue.
   * Sends the errors to the flush handler and clears local memory.
   *
   * @returns {Promise<void>} A promise that resolves when the flush operation is complete.
   */
  const flushEvents = useCallback(async () => {
    const currentErrorMapping = errorMappingRef.current;
    if (Object.keys(currentErrorMapping).length === 0) {
      return;
    }
    errorMappingRef.current = {};
    await onFlush(currentErrorMapping);
    await clearLocalMemory();
  }, [clearLocalMemory, onFlush]);

  /**
   * Adds a new error to the queue and manages its persistence and size.
   *
   * @param {ExtendedError<TError>} error - The error to add.
   * @returns {Promise<void>} A promise that resolves when the error is added.
   */
  const addError = useCallback(
    async (error: ExtendedError<TError>) => {
      const key = getKey(error);
      if (errorMappingRef.current.hasOwnProperty(key)) {
        errorMappingRef.current[key].Occurence++;
      } else {
        errorMappingRef.current[key] = {...error, Occurence: 1};
      }
      if (error.Persistence === ErrorPersistence.HIGH) {
        await updateMappingInLocalMemory(error);
      }
      if (sizeof(errorMappingRef.current) > maxAllowedSize) {
        await flushEvents();
      }
    },
    [flushEvents, getKey, maxAllowedSize, updateMappingInLocalMemory],
  );
  useEffect(() => {
    // Update the in-memory error mapping from local storage on component mount.
    updateErrorMappingFromLocalMemoryToInMemory();
  }, [updateErrorMappingFromLocalMemoryToInMemory]);
  return {flushEvents, addError};
};
