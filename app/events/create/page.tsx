"use client";

import React, { useState } from "react";
import { Ticket, Users, Plus, Trash2, Upload } from "lucide-react";

function CreateEvent() {
  const [formData, setFormData] = useState({
    image: "",
    title: "",
    host: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    location: "",
    description: "",
    requireApproval: false,
    isFree: true, // Free by default
    capacity: 0, // used only if event is free
    tickets: [] as { name: string; price: string; capacity: number }[],
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (e.target instanceof HTMLInputElement && type === "checkbox") {
      setFormData({ ...formData, [name]: e.target.checked });
    } else if (name === "isFree") {
      setFormData({ ...formData, isFree: value === "true" });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleTicketChange = (
    index: number,
    field: "name" | "price" | "capacity",
    value: string | number
  ) => {
    const updatedTickets = [...formData.tickets];
    updatedTickets[index] = { ...updatedTickets[index], [field]: value };
    setFormData({ ...formData, tickets: updatedTickets });
  };

  const addTicket = () => {
    setFormData({
      ...formData,
      tickets: [...formData.tickets, { name: "", price: "", capacity: 0 }],
    });
  };

  const removeTicket = (index: number) => {
    const updatedTickets = formData.tickets.filter((_, i) => i !== index);
    setFormData({ ...formData, tickets: updatedTickets });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Event created:", formData);
    alert("Event created successfully!");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewURL = URL.createObjectURL(file);
      setFormData({ ...formData, image: previewURL });
      // TODO: If you want to send file to backend, save `file` itself somewhere
    }
  };

  return (
    <div className="min-h-screen  mt-10 text-gray-200 flex justify-center py-10 px-4">
      <div className="flex flex-col lg:flex-row w-full max-w-5xl overflow-hidden">
        {/* Left side: image */}
        <div className="lg:w-1/2 flex flex-col items-center justify-start relative">
          {formData.image ? (
            <img
              src={formData.image}
              alt="Event"
              className="w-full h-90 object-contain rounded-lg shadow-lg"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-500 rounded-lg w-60 h-60">
              <Upload className="w-10 h-10 text-gray-400 mb-2" />
              <p className="text-gray-400 text-sm">Upload Event Image</p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="mt-4 text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 
              file:rounded-lg file:border file:order-gray-400 file:text-sm file:font-semibold 
              file:bg-gray-200 file:text-gray-800 hover:file:bg-purple-400     
          hover:file:bg-transparent hover:file:text-gray-300 hover:file:cursor-pointer
        file:transition file:duration-300"
          />
        </div>

        {/* Right side: form */}
        <form
          onSubmit={handleSubmit}
          className="lg:w-1/2 p-8 flex flex-col gap-6"
        >
          {/* Title */}
          <input
            type="text"
            name="title"
            placeholder="Event Name"
            value={formData.title}
            onChange={handleChange}
            required
            className="bg-gray-800 text-gray-300 rounded-lg p-3 w-full focus:ring-1 focus:ring-purple-500 outline-none"
          />

          {/* Host */}
          <input
            type="text"
            name="host"
            placeholder="Event Host"
            value={formData.host}
            onChange={handleChange}
            required
            className="bg-gray-800 text-gray-300 rounded-lg p-3 w-full focus:ring-1 focus:ring-purple-500 outline-none"
          />

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Start</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="bg-gray-800 text-gray-300 rounded-lg p-3 w-full focus:ring-1 focus:ring-purple-500 outline-none"
              />
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="mt-2 bg-gray-800 text-gray-300 rounded-lg p-3 w-full focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">End</label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="bg-gray-800 text-gray-300 rounded-lg p-3 w-full focus:ring-1 focus:ring-purple-500 outline-none"
              />
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className="mt-2 bg-gray-800 text-gray-300 rounded-lg p-3 w-full focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>

          {/* Location */}
          <input
            type="text"
            name="location"
            placeholder="Offline location or virtual link"
            value={formData.location}
            onChange={handleChange}
            className="bg-gray-800 text-gray-300 rounded-lg p-3 w-full focus:ring-1 focus:ring-purple-500 outline-none"
          />

          {/* Description */}
          <textarea
            name="description"
            placeholder="Add event description..."
            value={formData.description}
            onChange={handleChange}
            className="bg-gray-800 text-gray-300 rounded-lg p-3 w-full h-24 focus:ring-1 focus:ring-purple-500 outline-none"
          />

          {/* Free or Paid */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Event Type
            </label>
            <select
              name="isFree"
              value={formData.isFree ? "true" : "false"}
              onChange={handleChange}
              className="bg-gray-800 z-50 text-gray-300 rounded-lg p-3 w-full focus:ring-1 border border-gray-300/50 focus:ring-purple-500 outline-none"
            >
              <option value="true">Free</option>
              <option value="false">Paid</option>
            </select>
          </div>

          {/* Tickets Section */}
          {formData.isFree ? (
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Capacity
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                className="bg-gray-800 text-gray-300 rounded-lg p-3 w-full focus:ring-1 focus:ring-purple-500 outline-none"
              />
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="flex items-center gap-2 text-gray-300">
                  <Ticket className="h-4 w-4" /> Tickets
                </span>
                <button
                  type="button"
                  onClick={addTicket}
                  className="flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
                >
                  <Plus className="h-4 w-4" /> Add Ticket
                </button>
              </div>

              <div className="space-y-3">
                {formData.tickets.map((ticket, index) => (
                  <div
                    key={index}
                    className="flex gap-2 items-end bg-gray-800 p-3 rounded-lg flex-wrap"
                  >
                    <div className="flex flex-col flex-1">
                      <label className="text-xs text-gray-400 pb-1">Type</label>
                      <input
                        type="text"
                        placeholder="Ticket Name"
                        value={ticket.name}
                        onChange={(e) =>
                          handleTicketChange(index, "name", e.target.value)
                        }
                        className="bg-gray-600 text-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-purple-400 outline-none"
                      />
                    </div>

                    <div className="flex flex-col w-24">
                      <label className="text-xs text-gray-400 pb-1">
                        Price
                      </label>
                      <input
                        type="text"
                        placeholder="Price"
                        value={ticket.price}
                        onChange={(e) =>
                          handleTicketChange(index, "price", e.target.value)
                        }
                        className="bg-gray-600 text-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-purple-400 outline-none"
                      />
                    </div>

                    <div className="flex flex-col w-24">
                      <label className="text-xs text-gray-400 pb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        placeholder="Capacity"
                        value={ticket.capacity}
                        onChange={(e) =>
                          handleTicketChange(
                            index,
                            "capacity",
                            Number(e.target.value)
                          )
                        }
                        className="bg-gray-600 text-gray-300 rounded-lg p-2 focus:ring-1 focus:ring-purple-400 outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeTicket(index)}
                      className="text-red-400 hover:text-red-300 ml-2"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Require Approval */}
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Require Approval</span>
            <input
              type="checkbox"
              name="requireApproval"
              checked={formData.requireApproval}
              onChange={handleChange}
              className="w-5 h-5 accent-purple-500"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-gray-200 text-gray-800 rounded-lg px-4 py-2 text-md 
        font-bold border border-gray-400 hover:bg-transparent hover:text-gray-300 hover:cursor-pointer
        transition duration-300"
          >
            Create Event
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateEvent;
