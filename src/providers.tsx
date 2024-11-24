import React, {createContext, ReactNode} from 'react';
import {IUseTelemetryErrorManager, ExtendedError} from './types'; // Adjust the import based on your project structure
import {useErrorReporter} from './hooks';

// Define the context type
export type ErrorReportContextType<TError> = {
  handleError: (error: ExtendedError<TError>) => Promise<void> | void;
};

// Create the context
export const ErrorReportContext =
  createContext<ErrorReportContextType<any> | null>(null);

// Define the provider props
interface ErrorReportProviderProps<TError> {
  config: IUseTelemetryErrorManager<TError>; // Make the config generic
  children: ReactNode;
}

// Create the provider component
export const ErrorReportProvider = <TError,>({
  config,
  children,
}: ErrorReportProviderProps<TError>) => {
  const {handleReportError} = useErrorReporter<TError>(config);

  return (
    <ErrorReportContext.Provider value={{handleError: handleReportError}}>
      {children}
    </ErrorReportContext.Provider>
  );
};
