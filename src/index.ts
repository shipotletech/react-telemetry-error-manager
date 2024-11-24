import { useErrorAggregator } from "./hooks";
import { ErrorReportProvider } from "./providers";
import {
  IUseTelemetryErrorManager,
  IErrorStorage,
  ExtendedError,
  ErrorDictionary,
  BaseErrorDetails,
  ErrorPersistence,
} from "./types";
export { useErrorAggregator, ErrorReportProvider, ErrorPersistence };
export type {
  IUseTelemetryErrorManager,
  IErrorStorage,
  ExtendedError,
  ErrorDictionary,
  BaseErrorDetails,
};
