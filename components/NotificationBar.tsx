import React from "react";
import { Bell } from "lucide-react";

const isNotification = true;

function NotificationBar() {
  return (
    <div className="relative">
      <Bell className="w-5 h-5 text-gray-300 hover:text-gray-100" />
      <span
        className={`absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 ${isNotification ? 'block' : "hidden"}`}
      />
    </div>
  );
}

export default NotificationBar;
