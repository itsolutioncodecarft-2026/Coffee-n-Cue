import { AlertCircle, RefreshCw } from 'lucide-react'

export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <AlertCircle className="w-10 h-10 text-red-400" />
      <p className="text-sm text-red-600 font-medium">{message || 'Something went wrong'}</p>
      {onRetry && (
        <button onClick={onRetry} className="flex items-center gap-2 text-sm text-emerald-700 hover:underline">
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  )
}
