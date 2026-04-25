export const Button = ({ children, onClick, className, type }) => {
  return (
    <button
      type={type || 'button'}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-orange-500 text-white hover:bg-orange-600 h-10 px-4 py-2 ${className || ''}`}
    >
      {children}
    </button>
  );
};
