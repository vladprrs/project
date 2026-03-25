interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
}

export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div className="mx-4 mb-2 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2">
      <span className="text-sm text-red-600">
        Something went wrong: {message}.{' '}
        <button
          onClick={onRetry}
          className="font-semibold underline hover:no-underline"
        >
          Retry
        </button>
      </span>
      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-600 ml-2 text-sm"
        aria-label="Dismiss error"
      >
        x
      </button>
    </div>
  );
}
