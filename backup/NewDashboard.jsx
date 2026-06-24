import { useState, useEffect } from 'react';

function NewDashboard() {
  const [message, setMessage] = useState('Loading...');

  useEffect(() => {
    setMessage('Dashboard is working!');
  }, []);

  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold">{message}</h1>
    </div>
  );
}

export default NewDashboard;
