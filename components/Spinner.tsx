import { useEffect } from 'react';

const Spinner = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes wave {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(2); opacity: 0.5; }
      }
      .animate-wave {
        animation: wave 1.2s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="flex justify-center items-center min-h-[200px]">
      <div className="flex space-x-2">
        <div className="w-3 h-3 rounded-full bg-[#553b6d] animate-wave" style={{ animationDelay: '-0.4s' }} />
        <div className="w-3 h-3 rounded-full bg-[#7adb78] animate-wave" style={{ animationDelay: '-0.2s' }} />
        <div className="w-3 h-3 rounded-full bg-[#553b6d] animate-wave" />
      </div>
    </div>
  );
};

export default Spinner;
