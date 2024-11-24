# Error Management Library Documentation

## Overview

This library provides a comprehensive solution for error reporting and management in React and React Native applications. It includes hooks and context-based providers for managing error queues, persisting errors, and reporting errors asynchronously with customizable storage mechanisms.

---

## Installation

   ```bash
   npm i react-telemetry-error-manager
   ```
 ## How to use this library
Using this library in your project involves a straightforward two-step process:
 ### Step 1. Setup ErrorReportProvider
 Wrap your app with ```ErrorReportProvider``` to provide the error reporting context.
   ```bash
   import { ErrorReportProvider } from 'react-telemetry-error-manager';

const App = () => {
  const config : IUseTelemetryErrorManager = {
    getKey: (error) => error.Name,
    onFlush: (errors) => console.error(errors),
    Storage: {
            getStorageKey: () => 'errorMapping',
            setItem: async (key, value) => {
              AsyncStorage.setItem(key, JSON.stringify(value));
            },
            getItem: key => AsyncStorage.getItem(key),
            removeItem: key => AsyncStorage.removeItem(key),
            clear: () => AsyncStorage.clear(),
          }, // used for errors with high persistence
    maxSize: 1024 * 1024,
    flushInterval: 60000, // time interval to invoke onFlush function
  };

  return (
    <ErrorReportProvider config={config}>
      <YourApp />
    </ErrorReportProvider>
  );
};
```

### Step 2. Use useErrorAggregator 
Provides access to the error reporting context.
   ```bash
import { useErrorAggregator } from 'react-telemetry-error-manager';

const YourComponent = () => {
  const { handleError } = useErrorAggregator(); // puts error object to queue

  const reportError = () => {
    handleError({
      Name: 'NetworkError',
      Message: 'Failed to fetch data',
      StackTrace: '...',
      Occurrence: 1,
      Persistence: ErrorPersistence.HIGH,
    });
  };

  return <CustomButton title="Report Error" onNetworkError={reportError} />;
};
```
```markdown
## Contributing

We welcome contributions! Please follow these steps to contribute:

1. Fork the repository.
2. Create a new branch: `git checkout -b my-feature-branch`.
3. Make your changes and commit them: `git commit -m 'Add new feature'`.
4. Push to the branch: `git push origin my-feature-branch`.
5. Submit a pull request.
```
