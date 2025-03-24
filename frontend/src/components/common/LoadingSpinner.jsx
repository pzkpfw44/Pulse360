export default function LoadingSpinner({ size = "md", center = true }) {
    let sizeClasses = "w-8 h-8";
    
    switch (size) {
      case "sm":
        sizeClasses = "w-5 h-5";
        break;
      case "lg":
        sizeClasses = "w-12 h-12";
        break;
      case "xl":
        sizeClasses = "w-16 h-16";
        break;
      default:
        sizeClasses = "w-8 h-8";
    }
    
    const spinner = (
      <svg
        className={`animate-spin text-primary-500 ${sizeClasses}`}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    );
    
    if (center) {
      return (
        <div className="flex justify-center items-center py-4">
          {spinner}
        </div>
      );
    }
    
    return spinner;
  }