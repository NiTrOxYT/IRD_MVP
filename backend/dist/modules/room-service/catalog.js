export const REQUEST_TITLES = {
    cleaning: "Room Cleaning & Refresh",
    towels: "Fresh Bath Towels & Mats",
    toiletries: "Luxury Toiletries & Amenities",
    linen: "Fresh Bed Linen & Pillowcases",
    pillows_blankets: "Extra Pillows & Blankets",
    luggage: "Luggage & Porter Assistance",
    turndown: "Evening Turndown Service",
    other: "In-Suite Guest Assistance",
};
export const VALID_HOUSEKEEPING_STATUSES = [
    "pending",
    "accepted",
    "in_progress",
    "completed",
    "declined",
];
export const ALLOWED_HOUSEKEEPING_TRANSITIONS = {
    pending: ["accepted", "declined"],
    accepted: ["in_progress", "declined"],
    in_progress: ["completed", "declined"],
    completed: [],
    declined: [],
};
