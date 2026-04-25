export const Card = ({ children, className, onClick }) => {
  return (
    <div className={`rounded-lg border bg-white shadow-sm ${className || ''}`} onClick={onClick}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children }) => {
  return <div className="flex flex-col space-y-1.5 p-6">{children}</div>;
};

export const CardTitle = ({ children }) => {
  return <h3 className="text-lg font-semibold leading-none tracking-tight">{children}</h3>;
};

export const CardDescription = ({ children }) => {
  return <p className="text-sm text-gray-500">{children}</p>;
};

export const CardContent = ({ children }) => {
  return <div className="p-6 pt-0">{children}</div>;
};
