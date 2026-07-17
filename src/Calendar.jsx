import { useState, useEffect, useRef } from "react";
import EventEditor from "./EventEditor";
import LiveClock from "./LiveClock";

// Local storage helper functions
const STORAGE_KEYS = {
  EVENTS: "calendar_events",
  MOODS: "calendar_moods",
  DATE_COLORS: "calendar_date_colors",
  REMINDERS: "calendar_reminders",
};

// Helper functions for local storage operations
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`✅ Saved ${key} to local storage`, data);
  } catch (error) {
    console.error(`❌ Error saving ${key} to local storage:`, error);
  }
};

const loadFromLocalStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    console.log(`📖 Loading ${key} from local storage:`, data);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`❌ Error loading ${key} from local storage:`, error);
    return null;
  }
};

function useDarkTheme() {
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDarkTheme(document.body.classList.contains("dark-theme"));
    };

    checkTheme();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          checkTheme();
        }
      });
    });

    observer.observe(document.body, { attributes: true });
    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  return isDarkTheme;
}

function Calendar() {
  const [isLoading, setIsLoading] = useState(false);
  const [fcmToken, setFcmToken] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState(false);

  // All states initialized with data from local storage
  const [event, setEvent] = useState([]);
  const [currentView, setCurrentView] = useState("month");
  const [moods, setMoods] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventViewerActive, setEventViewerActive] = useState(false);
  const [viewerBg, setViewerBg] = useState("#000033");
  const [yearViewYear, setYearViewYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showEventEditor, setShowEventEditor] = useState(false);
  const [deleteWarningActive, setDeleteWarningActive] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [dateColors, setDateColors] = useState({});

  // Track if data has been loaded to prevent overwriting
  const hasLoadedRef = useRef(false);

  // Load data from local storage on component mount - ONLY ONCE
  useEffect(() => {
    // Skip if already loaded
    if (hasLoadedRef.current) {
      console.log("⏭️ Data already loaded, skipping...");
      return;
    }

    const loadAllData = () => {
      console.log("🔄 Loading calendar data from local storage...");
      setIsLoading(true);

      try {
        // Load events
        const loadedEvents = loadFromLocalStorage(STORAGE_KEYS.EVENTS);
        if (
          loadedEvents &&
          Array.isArray(loadedEvents) &&
          loadedEvents.length > 0
        ) {
          setEvent(loadedEvents);
          console.log(
            `✅ Loaded ${loadedEvents.length} events from local storage`,
          );
        } else {
          console.log("ℹ️ No events found in local storage, using empty array");
          setEvent([]);
        }

        // Load moods
        const loadedMoods = loadFromLocalStorage(STORAGE_KEYS.MOODS);
        if (
          loadedMoods &&
          Array.isArray(loadedMoods) &&
          loadedMoods.length > 0
        ) {
          setMoods(loadedMoods);
          console.log(
            `✅ Loaded ${loadedMoods.length} moods from local storage`,
          );
        } else {
          setMoods([]);
        }

        // Load date colors
        const loadedDateColors = loadFromLocalStorage(STORAGE_KEYS.DATE_COLORS);
        if (
          loadedDateColors &&
          typeof loadedDateColors === "object" &&
          Object.keys(loadedDateColors).length > 0
        ) {
          setDateColors(loadedDateColors);
          console.log(
            `✅ Loaded ${Object.keys(loadedDateColors).length} date colors from local storage`,
          );
        } else {
          setDateColors({});
        }

        hasLoadedRef.current = true;
      } catch (error) {
        console.error("❌ Error loading data from local storage:", error);
        setEvent([]);
        setMoods([]);
        setDateColors({});
        hasLoadedRef.current = true;
      } finally {
        setIsLoading(false);
      }
    };

    loadAllData();
  }, []); // Empty dependency array - runs only once on mount

  // Save events to local storage when they change
  useEffect(() => {
    if (hasLoadedRef.current) {
      saveToLocalStorage(STORAGE_KEYS.EVENTS, event);
    }
  }, [event]);

  // Save moods to local storage when they change
  useEffect(() => {
    if (hasLoadedRef.current) {
      saveToLocalStorage(STORAGE_KEYS.MOODS, moods);
    }
  }, [moods]);

  // Save date colors to local storage when they change
  useEffect(() => {
    if (hasLoadedRef.current) {
      saveToLocalStorage(STORAGE_KEYS.DATE_COLORS, dateColors);
    }
  }, [dateColors]);

  const isDarkTheme = useDarkTheme();

  // Helper functions
  function getMonthDatesByWeekday(month, year) {
    const now = new Date();
    const defaultMonth = now.getMonth();
    const defaultYear = now.getFullYear();

    let targetMonth;
    if (typeof month === "string") {
      const monthNames = [
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "august",
        "september",
        "october",
        "november",
        "december",
      ];
      const monthLower = month.toLowerCase();
      targetMonth = monthNames.indexOf(monthLower);
      if (targetMonth === -1) {
        targetMonth = defaultMonth;
      }
    } else if (typeof month === "number" && month >= 0 && month <= 11) {
      targetMonth = month;
    } else {
      targetMonth = defaultMonth;
    }

    let targetYear;
    if (year !== undefined) {
      targetYear = Number(year);
      if (isNaN(targetYear)) {
        targetYear = defaultYear;
      }
    } else {
      targetYear = defaultYear;
    }

    const firstDayOfMonth = new Date(targetYear, targetMonth, 1);
    const lastDayOfMonth = new Date(targetYear, targetMonth + 1, 0);

    const result = {
      Sunday: [],
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
    };

    const currentDate = new Date(firstDayOfMonth);

    while (currentDate <= lastDayOfMonth) {
      const dayOfMonth = currentDate.getDate();
      const dayOfWeek = currentDate.getDay();
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const dayName = dayNames[dayOfWeek];
      result[dayName].push(dayOfMonth);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  function getWeeks(month = currentMonth, year = currentYear) {
    const monthDates = getMonthDatesByWeekday(month, year);
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    let firstDayIndex = -1;
    for (let i = 0; i < dayNames.length; i++) {
      if (monthDates[dayNames[i]].includes(1)) {
        firstDayIndex = i;
        break;
      }
    }

    if (firstDayIndex === -1) {
      return [];
    }

    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    const allDates = [];
    for (let i = 1; i <= totalDays; i++) {
      allDates.push(i);
    }

    const weeks = [];
    const week1 = Array(7).fill(" ");

    for (
      let i = firstDayIndex, dayIndex = 0;
      i < 7 && dayIndex < allDates.length;
      i++, dayIndex++
    ) {
      week1[i] = allDates[dayIndex];
    }
    weeks.push(week1);

    let dayIndex = 7 - firstDayIndex;

    while (dayIndex < allDates.length) {
      const week = [];
      for (let i = 0; i < 7 && dayIndex < allDates.length; i++, dayIndex++) {
        week.push(allDates[dayIndex]);
      }
      while (week.length < 7) {
        week.push(" ");
      }
      weeks.push(week);
    }

    return weeks;
  }

  function getDayForDate(targetDate) {
    const dateObj = new Date(currentYear, currentMonth, targetDate);
    const dayOfWeek = dateObj.getDay();
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return dayNames[dayOfWeek];
  }

  function getOrdinalSuffix(date) {
    if (!date) return "";
    const lastDigit = date % 10;
    const lastTwoDigits = date % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return `${date}th`;
    }
    switch (lastDigit) {
      case 1:
        return `${date}st`;
      case 2:
        return `${date}nd`;
      case 3:
        return `${date}rd`;
      default:
        return `${date}th`;
    }
  }

  function needsConnectionToRight(date) {
    const dateKey = `${currentYear}-${currentMonth + 1}-${date}`;
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    if (date === lastDayOfMonth) {
      return false;
    }

    for (const ev of event) {
      if (ev.dateKeys && ev.dateKeys.includes(dateKey)) {
        const nextDate = date + 1;
        const nextDateKey = `${currentYear}-${currentMonth + 1}-${nextDate}`;
        if (ev.dateKeys.includes(nextDateKey)) {
          return true;
        }
      }
    }
    return false;
  }

  function needsConnectionToNextMonth(date) {
    const dateKey = `${currentYear}-${currentMonth + 1}-${date}`;
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    if (date !== lastDayOfMonth) {
      return false;
    }

    for (const ev of event) {
      if (ev.dateKeys && ev.dateKeys.includes(dateKey)) {
        if (ev.spansMonths) {
          const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
          const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
          const nextMonthFirstDayKey = `${nextYear}-${nextMonth + 1}-1`;
          if (ev.dateKeys.includes(nextMonthFirstDayKey)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function getEventConnectionInfo(date) {
    const dateKey = `${currentYear}-${currentMonth + 1}-${date}`;
    const eventsForDate = event.filter(
      (item) => item.dateKeys && item.dateKeys.includes(dateKey),
    );

    if (eventsForDate.length === 0) {
      return { hasEvent: false, connectionClass: "" };
    }

    const needsRightConnection = needsConnectionToRight(date);
    const needsNextMonthConnection = needsConnectionToNextMonth(date);
    let connectionClass = "";

    if (needsNextMonthConnection) {
      connectionClass = "last-day-connected";
    } else if (needsRightConnection) {
      connectionClass = "connected-right";
    }

    return { hasEvent: true, connectionClass };
  }

  function getAllMonthsForYear(targetYear) {
    const monthsData = {};

    for (let month = 0; month < 12; month++) {
      const monthName = new Date(targetYear, month).toLocaleString("default", {
        month: "long",
      });

      const monthDates = getMonthDatesByWeekday(month, targetYear);
      const weeks = getWeeks(month, targetYear);

      monthsData[monthName] = {
        monthNumber: month,
        year: targetYear,
        monthDates: monthDates,
        weeks: weeks,
        totalDays: new Date(targetYear, month + 1, 0).getDate(),
        firstDay: new Date(targetYear, month, 1).getDay(),
        monthName: monthName,
      };
    }

    return monthsData;
  }

  // Navigation functions
  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  }

  function goToPrevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  }

  function goToYearView() {
    setYearViewYear(currentYear);
    setCurrentView("year");
  }

  function goToMonthView() {
    setCurrentView("month");
  }

  function updateEventViewer(date) {
    setSelectedDate(date);
    setEventViewerActive(true);
  }

  function closeEventViewer() {
    setEventViewerActive(false);
    setSelectedDate(null);
  }

  function addEventForSelectedDate() {
    setShowEventEditor(true);
  }

  function handleEditEvent(eventId) {
    const eventToEdit = event.find((e) => e.id === eventId);
    if (eventToEdit) {
      setEditingEvent(eventToEdit);
      setShowEventEditor(true);
    }
  }

  function handleSaveEvent(eventData) {
    if (!selectedDate) return;

    const startDate = parseInt(selectedDate);
    const endDate = eventData.endDate ? parseInt(eventData.endDate) : startDate;
    const lastDayOfCurrentMonth = new Date(
      currentYear,
      currentMonth + 1,
      0,
    ).getDate();
    const spansToNextMonth = endDate < startDate;

    if (spansToNextMonth) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

      const currentMonthDates = [];
      const currentMonthKeys = [];
      for (let d = startDate; d <= lastDayOfCurrentMonth; d++) {
        currentMonthDates.push(d);
        currentMonthKeys.push(`${currentYear}-${currentMonth + 1}-${d}`);
      }

      const nextMonthDates = [];
      const nextMonthKeys = [];
      for (let d = 1; d <= endDate; d++) {
        nextMonthDates.push(d);
        nextMonthKeys.push(`${nextYear}-${nextMonth + 1}-${d}`);
      }

      const eventDates = [...currentMonthDates, ...nextMonthDates];
      const dateKeys = [...currentMonthKeys, ...nextMonthKeys];
      const actualEndDate = endDate;
      const totalDays = eventDates.length;

      if (editingEvent) {
        const updatedEvents = event.map((ev) =>
          ev.id === editingEvent.id
            ? {
                ...ev,
                name: eventData.name,
                description: eventData.description,
                time: eventData.time,
                location: eventData.location,
                startDate: startDate,
                endDate: actualEndDate,
                totalDays: totalDays,
                eventDates: eventDates,
                dateKeys: dateKeys,
                startMonth: currentMonth,
                startYear: currentYear,
                endMonth: nextMonth,
                endYear: nextYear,
                spansMonths: true,
              }
            : ev,
        );
        setEvent(updatedEvents);
        setEditingEvent(null);
      } else {
        const newEvent = {
          id: Date.now(),
          startDate: startDate,
          endDate: actualEndDate,
          totalDays: totalDays,
          eventDates: eventDates,
          dateKeys: dateKeys,
          month: currentMonth,
          year: currentYear,
          startMonth: currentMonth,
          startYear: currentYear,
          endMonth: nextMonth,
          endYear: nextYear,
          name: eventData.name,
          description: eventData.description,
          time: eventData.time,
          location: eventData.location,
          spansMonths: true,
        };

        console.log("Adding multi-month event:", newEvent);
        setEvent((prev) => [...prev, newEvent]);
      }
    } else {
      const actualStartDate = Math.min(startDate, endDate);
      const actualEndDate = Math.max(startDate, endDate);

      const eventDates = [];
      for (let d = actualStartDate; d <= actualEndDate; d++) {
        eventDates.push(d);
      }

      const dateKeys = eventDates.map(
        (date) => `${currentYear}-${currentMonth + 1}-${date}`,
      );
      const totalDays = eventDates.length;

      if (editingEvent) {
        const updatedEvents = event.map((ev) =>
          ev.id === editingEvent.id
            ? {
                ...ev,
                name: eventData.name,
                description: eventData.description,
                time: eventData.time,
                location: eventData.location,
                startDate: actualStartDate,
                endDate: actualEndDate,
                totalDays: totalDays,
                eventDates: eventDates,
                dateKeys: dateKeys,
                spansMonths: false,
              }
            : ev,
        );
        setEvent(updatedEvents);
        setEditingEvent(null);
      } else {
        const newEvent = {
          id: Date.now(),
          startDate: actualStartDate,
          endDate: actualEndDate,
          totalDays: totalDays,
          eventDates: eventDates,
          dateKeys: dateKeys,
          month: currentMonth,
          year: currentYear,
          name: eventData.name,
          description: eventData.description,
          time: eventData.time,
          location: eventData.location,
          spansMonths: false,
        };

        console.log("Adding single-month event:", newEvent);
        setEvent((prev) => [...prev, newEvent]);
      }
    }
    setShowEventEditor(false);
  }

  function updateEventViewerBackgroundColor(color) {
    if (!selectedDate) return;

    const dateKey = `${currentYear}-${currentMonth + 1}-${selectedDate}`;
    const hasEventForDate = event.some(
      (item) => item.dateKeys && item.dateKeys.includes(dateKey),
    );

    setViewerBg(color);

    if (hasEventForDate) {
      setDateColors((prev) => ({
        ...prev,
        [dateKey]: color,
      }));
    }
  }

  function handleMood() {
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    const dateKey = `${todayYear}-${todayMonth + 1}-${todayDate}`;
    const mood = window.prompt("Enter mood (emoji):");

    if (mood === null || mood.trim() === "") {
      return;
    }

    const existingMoodIndex = moods.findIndex(
      (item) => item.dateKey === dateKey,
    );

    if (existingMoodIndex !== -1) {
      setMoods((prev) =>
        prev.map((m, index) =>
          index === existingMoodIndex ? { ...m, mood: mood } : m,
        ),
      );
      alert(`Mood updated for today!`);
    } else {
      const newMood = {
        id: Date.now(),
        dateKey: dateKey,
        date: todayDate,
        month: todayMonth,
        year: todayYear,
        mood: mood,
      };

      setMoods((prev) => [...prev, newMood]);
      alert(`Mood added for today!`);
    }
  }

  function onEventDelete(eventId) {
    setEventToDelete(eventId);
    setDeleteWarningActive(true);
  }

  function cancelDelete() {
    setDeleteWarningActive(false);
    setEventToDelete(null);
  }

  function confirmDelete() {
    if (!eventToDelete) {
      setDeleteWarningActive(false);
      return;
    }

    const eventToRemove = event.find((e) => e.id === eventToDelete);
    const updatedEvents = event.filter((event) => event.id !== eventToDelete);

    setEvent(updatedEvents);

    if (eventToRemove && eventToRemove.dateKeys) {
      const newColors = { ...dateColors };
      eventToRemove.dateKeys.forEach((dateKey) => {
        delete newColors[dateKey];
      });
      setDateColors(newColors);
    }

    setDeleteWarningActive(false);
    setEventToDelete(null);

    if (eventToRemove && selectedDate) {
      const dateKey = `${currentYear}-${currentMonth + 1}-${selectedDate}`;
      const remainingEvents = updatedEvents.filter(
        (e) => e.dateKeys && e.dateKeys.includes(dateKey),
      );

      if (remainingEvents.length === 0) {
        setEventViewerActive(false);
      }
    }

    alert("Event deleted successfully!");
  }

  async function addReminderForSelectedDate() {
    if (!selectedDate) {
      alert("Select a date first");
      return;
    }

    if (!notificationPermission) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert(
          "Notification permission is required for reminders. Please enable it in your browser settings.",
        );
        return;
      }
      setNotificationPermission(true);
    }

    const timeInput = prompt(
      "Enter reminder time (HH:MM, 24h format)",
      "09:00",
    );
    if (!timeInput) return;

    const [hh, mm] = timeInput.split(":").map(Number);
    if (isNaN(hh) || isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
      alert("Invalid time format. Please use HH:MM (e.g., 14:30)");
      return;
    }

    const message = prompt("Reminder message:");
    if (!message) return;

    const reminderDate = new Date(
      currentYear,
      currentMonth,
      selectedDate,
      hh,
      mm,
      0,
      0,
    );
    const fireAt = reminderDate.getTime();

    if (fireAt <= Date.now()) {
      alert("Reminder time must be in the future");
      return;
    }

    const dateKey = `${currentYear}-${currentMonth + 1}-${selectedDate}`;
    const eventsForDate = event.filter((e) => e.dateKeys?.includes(dateKey));

    let eventId = null;
    let eventName = null;

    if (eventsForDate.length > 0) {
      const eventOptions = eventsForDate
        .map((e, i) => `${i + 1}. ${e.name}${e.time ? ` at ${e.time}` : ""}`)
        .join("\n");

      const choice = prompt(
        `Events on this date:\n${eventOptions}\n\nEnter the number to associate with this reminder, or press Enter for a generic reminder:`,
      );

      if (choice && !isNaN(parseInt(choice))) {
        const selectedIndex = parseInt(choice) - 1;
        if (selectedIndex >= 0 && selectedIndex < eventsForDate.length) {
          const selectedEvent = eventsForDate[selectedIndex];
          eventId = selectedEvent.id;
          eventName = selectedEvent.name;
        }
      }
    }

    const reminderData = {
      message: eventName ? `Reminder: ${eventName} - ${message}` : message,
      fireAt: fireAt,
      dateKey: dateKey,
      eventId: eventId,
      eventName: eventName,
      originalMessage: message,
    };

    try {
      const existingReminders =
        loadFromLocalStorage(STORAGE_KEYS.REMINDERS) || [];
      const newReminder = {
        id: Date.now(),
        ...reminderData,
        status: "scheduled",
        createdAt: new Date().toISOString(),
        deviceId:
          localStorage.getItem("calendar_device_id") || "default_device",
      };

      const updatedReminders = [...existingReminders, newReminder];
      saveToLocalStorage(STORAGE_KEYS.REMINDERS, updatedReminders);

      console.log("✅ Reminder saved to local storage:", newReminder);
      alert(
        `✅ Reminder scheduled for ${new Date(reminderData.fireAt).toLocaleString()}`,
      );
    } catch (error) {
      console.error("Error saving reminder to local storage:", error);
    }
  }

  function clearAllCalendarData() {
    if (window.confirm("Are you sure you want to clear all calendar data?")) {
      localStorage.removeItem(STORAGE_KEYS.EVENTS);
      localStorage.removeItem(STORAGE_KEYS.MOODS);
      localStorage.removeItem(STORAGE_KEYS.DATE_COLORS);
      localStorage.removeItem(STORAGE_KEYS.REMINDERS);

      setEvent([]);
      setMoods([]);
      setDateColors({});

      console.log("🗑️ All calendar data cleared from local storage");
      alert("All calendar data has been cleared.");
      window.location.reload();
    }
  }

  // EventViewer Component
  function EventViewerComponent() {
    if (!eventViewerActive || !selectedDate) return null;

    const dateKey = `${currentYear}-${currentMonth + 1}-${selectedDate}`;
    const eventsForSelectedDate = event.filter(
      (item) => item.dateKeys && item.dateKeys.includes(dateKey),
    );

    const moodForSelectedDate = moods.find((item) => item.dateKey === dateKey);
    const day = getDayForDate(selectedDate);
    const backgroundColor = dateColors[dateKey] || viewerBg;

    return (
      <div
        style={{
          marginTop: "20px",
          padding: "20px",
          background: backgroundColor,
        }}
        className="event-viewer"
      >
        <div className="event-viewer-name">
          <h3 style={{ color: "white" }}>EVENT VIEWER</h3>
        </div>
        <div className="event-header">
          <h3
            style={{
              color: "white",
              fontSize: "30px",
            }}
          >
            {day}, {getOrdinalSuffix(selectedDate)}.
          </h3>
          <button className="cls-nt-btn" onClick={closeEventViewer}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="add-evnt-btn">
          <button className="evnt-reminder" onClick={addEventForSelectedDate}>
            <i className="fa-solid fa-square-plus"></i>
          </button>
        </div>

        {moodForSelectedDate && (
          <div
            className="mood-display"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "15px",
              marginBottom: "10px",
              fontSize: "15px",
              color: "greenyellow",
            }}
          >
            {moodForSelectedDate.mood}
          </div>
        )}
        {eventsForSelectedDate.length === 0 ? (
          <div className="warn">
            <p style={{ color: "white", marginTop: "30px" }}>No Events.</p>
          </div>
        ) : (
          eventsForSelectedDate.map((item, index) => (
            <div
              key={item.id}
              className="event-name-text"
              style={{
                color: "white",
                marginTop: "20px",
                gap: "10px",
                padding: "15px",
                borderRadius: "8px",
              }}
            >
              <div
                className="event-name"
                style={{
                  lineHeight: "1.6",
                  fontWeight: "bold",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "30px",
                }}
              >
                {index + 1}.{" "}
                <span style={{ color: "gold" }}>
                  <i className="fa-solid fa-tag"></i>
                </span>{" "}
                {item.name}
                {item.eventDates && item.eventDates.length > 1 && (
                  <span
                    style={{
                      fontSize: "18px",
                      color: "#ccc",
                      marginLeft: "10px",
                    }}
                  >
                    ({item.startDate} - {item.endDate})
                  </span>
                )}
              </div>

              <hr
                style={{
                  borderColor: "white",
                  margin: "10px 0",
                }}
              />

              {item.description && (
                <div
                  className="event-desc"
                  style={{
                    lineHeight: "1.6",
                    fontWeight: "bold",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "25px",
                  }}
                >
                  <span style={{ color: "orange" }}>
                    <i className="fa-solid fa-circle-info"></i>
                  </span>{" "}
                  Description: {item.description}
                </div>
              )}

              {item.time && (
                <div
                  className="event-time"
                  style={{
                    lineHeight: "1.6",
                    fontWeight: "bold",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "25px",
                  }}
                >
                  <span style={{ color: "yellow" }}>
                    <i className="fa-solid fa-clock"></i>
                  </span>{" "}
                  Time: {item.time}
                </div>
              )}

              {item.location && (
                <div
                  className="event-loc"
                  style={{
                    lineHeight: "1.6",
                    fontWeight: "bold",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "25px",
                  }}
                >
                  <span style={{ color: "green" }}>
                    <i className="fa-solid fa-location-dot"></i>
                  </span>{" "}
                  Location: {item.location}
                </div>
              )}

              <hr
                style={{
                  borderColor: "white",
                  margin: "10px 0",
                }}
              />
              <div className="event-dlt-btn">
                <button
                  className="dlt-evnt-btn"
                  onClick={() => handleEditEvent(item.id)}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <i className="fa-solid fa-pen"></i>
                </button>

                <button
                  className="dlt-evnt-btn"
                  onClick={() => onEventDelete(item.id)}
                  style={{
                    cursor: "pointer",
                  }}
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  // YearView Component
  function YearViewComponent({ year, isDarkTheme }) {
    const yearData = getAllMonthsForYear(year);
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const handlePrevYear = () => {
      setYearViewYear((prev) => prev - 1);
    };

    const handleNextYear = () => {
      setYearViewYear((prev) => prev + 1);
    };

    const handleMonthCardClick = (monthName) => {
      const monthIndex = monthNames.indexOf(monthName);
      if (monthIndex !== -1) {
        setCurrentMonth(monthIndex);
        setCurrentYear(year);
        setCurrentView("month");
      }
    };

    // Helper to render month content
    const renderMonthContent = (monthName, monthData, weeks, yr) => {
      const dayAbbreviations = ["S", "M", "T", "W", "T", "F", "S"];
      const today = new Date();
      const todayDate = today.getDate();

      return (
        <>
          <div
            className="month-header"
            style={{
              textAlign: "center",
              marginBottom: "10px",
            }}
          >
            <p
              className="month-title"
              style={{
                margin: 0,
                fontSize: "11px",
                color: isDarkTheme ? "white" : "#000033",
              }}
            >
              {monthName.substring(0, 3)}
            </p>
          </div>

          <div
            className="month-day-headers"
            style={{
              display: "flex",
              marginBottom: "5px",
            }}
          >
            {dayAbbreviations.map((day, index) => (
              <span
                key={index}
                className="day-header"
                style={{
                  fontSize: "12px",
                  textAlign: "center",
                  color: isDarkTheme ? "white" : "#000033",
                  flex: "1",
                  minWidth: "0",
                }}
              >
                {day}
              </span>
            ))}
          </div>

          <div className="month-weeks">
            {weeks.map((week, weekIndex) => (
              <div
                key={weekIndex}
                className="month-week"
                style={{
                  display: "flex",
                  marginBottom: "2px",
                  alignItems: "center",
                }}
              >
                {week.map((date, dateIndex) => {
                  if (date === " ") {
                    return (
                      <span
                        key={dateIndex}
                        className="month-date empty"
                        style={{
                          fontSize: "12px",
                          textAlign: "center",
                          padding: "2px 0",
                          flex: "1",
                          minWidth: "0",
                        }}
                      >
                        &nbsp;
                      </span>
                    );
                  }

                  const isToday =
                    yr === today.getFullYear() &&
                    monthData.monthNumber === today.getMonth() &&
                    date === today.getDate();

                  const dateKey = `${yr}-${monthData.monthNumber + 1}-${date}`;
                  const hasEvent = event.some(
                    (item) => item.dateKeys && item.dateKeys.includes(dateKey),
                  );

                  const dateObj = new Date(yr, monthData.monthNumber, date);
                  const isSunday = dateObj.getDay() === 0;

                  return (
                    <span
                      key={dateIndex}
                      className={`month-date ${isToday ? "today" : ""} ${
                        hasEvent ? "has-event" : ""
                      }`}
                      style={{
                        fontSize: "12px",
                        textAlign: "center",
                        padding: "2px 0",
                        color: isToday
                          ? "white"
                          : hasEvent
                            ? "white"
                            : isSunday
                              ? "red"
                              : isDarkTheme
                                ? "white"
                                : "#000033",
                        borderRadius: "8px",
                        backgroundColor: hasEvent
                          ? "green"
                          : isToday
                            ? "#3a65d2"
                            : "transparent",
                        cursor: hasEvent ? "pointer" : "default",
                        fontWeight: hasEvent
                          ? "bold"
                          : isToday
                            ? "bold"
                            : "normal",
                        border: hasEvent
                          ? "1px solid green"
                          : isToday
                            ? "1px solid #3a65d2"
                            : "none",
                        flex: "1",
                        minWidth: "0",
                      }}
                      onClick={() => {
                        if (hasEvent) {
                          setCurrentMonth(monthData.monthNumber);
                          setCurrentYear(yr);
                          setSelectedDate(date);
                          setEventViewerActive(true);
                          setCurrentView("month");
                        }
                      }}
                    >
                      {date}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      );
    };

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="year-view-container"
          style={{
            overflowY: "auto",
            padding: "10px",
          }}
        >
          <div
            className="year-header"
            style={{
              textAlign: "center",
              marginBottom: "20px",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "15px",
              position: "relative",
            }}
          >
            <button
              onClick={handlePrevYear}
              style={{
                background: "none",
                border: "none",
                color: isDarkTheme ? "white" : "#000033",
                fontSize: "22px",
                cursor: "pointer",
              }}
              title="Previous Year"
            >
              <i className="fa-solid fa-angles-left"></i>
            </button>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <p
                style={{
                  fontSize: "22px",
                  margin: 0,
                  color: isDarkTheme ? "white" : "#000033",
                }}
              >
                {year}
              </p>
            </div>

            <button
              onClick={handleNextYear}
              style={{
                background: "none",
                border: "none",
                color: isDarkTheme ? "white" : "#000033",
                fontSize: "22px",
                cursor: "pointer",
              }}
            >
              <i className="fa-solid fa-angles-right"></i>
            </button>
          </div>

          <div
            className="months-container"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
            }}
          >
            {[0, 3, 6, 9].map((startIndex) => (
              <div
                key={startIndex}
                className="month-row"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "5px",
                  marginBottom: "5px",
                }}
              >
                {monthNames
                  .slice(startIndex, startIndex + 3)
                  .map((monthName) => {
                    const monthData = yearData[monthName];
                    const weeks = monthData?.weeks || [];

                    return (
                      <div
                        key={monthName}
                        className="month-card"
                        style={{
                          backgroundColor: isDarkTheme ? "black" : "white",
                          padding: startIndex === 0 ? "5px" : "10px",
                          cursor: "pointer",
                        }}
                        onClick={() => handleMonthCardClick(monthName)}
                        title={`Click to view ${monthName} ${year}`}
                      >
                        {renderMonthContent(monthName, monthData, weeks, year)}
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const wks = getWeeks();
  const date = new Date(currentYear, currentMonth);
  const formatted = date.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === currentMonth && today.getFullYear() === currentYear;
  const todayDate = isCurrentMonth ? today.getDate() : null;

  return (
    <>
      <div className="time" style={{ marginTop: "70px" }}>
        <div>
          <h1
            style={{
              color: isDarkTheme ? "white" : "#000033",
              fontFamily: '"Inter", sans-serif',
              fontSize: "25px",
            }}
          >
            <i className="fa-solid fa-calendar-days"></i>&nbsp;CALENDAR
          </h1>
          {/* <button
            onClick={clearAllCalendarData}
            style={{
              marginLeft: "10px",
              padding: "5px 10px",
              fontSize: "12px",
              backgroundColor: "#ff4444",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Clear Data
          </button> */}
        </div>
        <LiveClock />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
          marginTop: "20px",
          padding: "10px",
        }}
        className="toggle-buttons-container"
      >
        <button className="new-action-button" onClick={goToYearView}>
          Year View
        </button>

        <button className="new-action-button" onClick={goToMonthView}>
          Month View
        </button>
      </div>

      {currentView === "month" && (
        <div
          className="calendar-div-main-main"
          style={{ overflow: "hidden", height: "100vh" }}
        >
          <div className="calendar-div-main">
            <div className="clndr-wrpr">
              <div className="month-name">
                <button onClick={goToPrevMonth} className="prev-mnth-btn">
                  <i
                    className="fa-solid fa-angles-left"
                    style={{
                      color: isDarkTheme ? "white" : "#000033",
                      fontSize: "20px",
                    }}
                  ></i>
                </button>
                <p
                  style={{
                    color: isDarkTheme ? "white" : "#000033",
                    fontSize: "20px",
                  }}
                >
                  {formatted}
                </p>

                <button onClick={goToNextMonth} className="nxt-mnth-btn">
                  <i
                    className="fa-solid fa-angles-right"
                    style={{
                      color: isDarkTheme ? "white" : "#000033",
                      fontSize: "20px",
                    }}
                  ></i>
                </button>
              </div>
              <div
                className="mood-select"
                onClick={handleMood}
                style={{
                  fontSize: "15px",
                  color: isDarkTheme ? "white" : "#000033",
                  marginBottom: "12px",
                }}
              >
                {(() => {
                  const today = new Date();
                  const todayDate = today.getDate();
                  const todayMonth = today.getMonth();
                  const todayYear = today.getFullYear();

                  const isTodayInCurrentMonth =
                    todayMonth === currentMonth && todayYear === currentYear;

                  if (!isTodayInCurrentMonth) {
                    return (
                      <span style={{ fontSize: "12px" }}>
                        Navigate to current month to add mood
                      </span>
                    );
                  }

                  const dateKey = `${todayYear}-${todayMonth + 1}-${todayDate}`;
                  const todayMood = moods.find((m) => m.dateKey === dateKey);

                  return (
                    todayMood?.mood || (
                      <span style={{ fontSize: "14px" }}>
                        Click to add thought of the day
                      </span>
                    )
                  );
                })()}
              </div>
              <div className="day-names-div">
                <p>SU</p>
                <p>MO</p>
                <p>TU</p>
                <p>WE</p>
                <p>TH</p>
                <p>FR</p>
                <p>SA</p>
              </div>

              {wks.map((week, weekIndex) => (
                <div key={weekIndex} className="week-container">
                  <div className="week-dates">
                    {week.map((date, dateIndex) => {
                      if (date === " ") {
                        return (
                          <span
                            key={dateIndex}
                            className="date-item"
                            style={{
                              fontWeight: "bold",
                              fontSize: "20px",
                              visibility: "hidden",
                              pointerEvents: "none",
                              minWidth: "40px",
                              textAlign: "center",
                              display: "inline-block",
                            }}
                          >
                            <span className="empty-space">
                              &nbsp;&nbsp;&nbsp;&nbsp;
                            </span>
                          </span>
                        );
                      }

                      const connection = getEventConnectionInfo(date);
                      const hasEvent = connection.hasEvent;
                      const connectionClass = connection.connectionClass;

                      let borderStyle = {};
                      if (hasEvent) {
                        borderStyle = {
                          borderRadius: "8px",
                        };
                      }

                      const dateObj = new Date(currentYear, currentMonth, date);
                      const isSunday = dateObj.getDay() === 0;

                      return (
                        <span
                          key={dateIndex}
                          className={`date-item ${connectionClass} ${
                            hasEvent ? "has-event" : ""
                          }`}
                          style={{
                            color:
                              date === todayDate
                                ? "#3a65d2"
                                : hasEvent
                                  ? "green"
                                  : isSunday
                                    ? "red"
                                    : isDarkTheme
                                      ? "white"
                                      : "#000033",
                            fontSize: "16px",
                            border: hasEvent
                              ? "2px solid green"
                              : date === todayDate
                                ? "2px solid #3a65d2"
                                : "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            ...borderStyle,
                            padding: "2px 8px",
                            display: "inline-block",
                            minWidth: "40px",
                            textAlign: "center",
                            position: "relative",
                          }}
                          onClick={() =>
                            date !== " " && updateEventViewer(date)
                          }
                        >
                          {date}
                          {connectionClass === "last-day-connected" && (
                            <span
                              style={{
                                position: "absolute",
                                right: "-5px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                fontSize: "12px",
                                color: "white",
                              }}
                            >
                              →
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <EventViewerComponent />

            {showEventEditor && (
              <EventEditor
                onClose={() => {
                  setShowEventEditor(false);
                  setEditingEvent(null);
                }}
                onSaveEvent={handleSaveEvent}
                editingEvent={editingEvent}
              />
            )}

            {deleteWarningActive && (
              <>
                <div className="backdrop" onClick={cancelDelete}></div>
                <div className="dlt-wrn">
                  <div className="wrng">
                    <p>Are you sure ?</p>
                  </div>
                  <div className="yes-no-btn-div">
                    <button className="btn-y" onClick={confirmDelete}>
                      Yes
                    </button>
                    <button className="btn-x" onClick={cancelDelete}>
                      No
                    </button>
                  </div>
                </div>
              </>
            )}

            <div
              className="calendar-warning"
              style={{ marginTop: "35px", color: "#000033" }}
            >
              <p>Click on dates to see or add events.</p>
            </div>
          </div>
        </div>
      )}
      {currentView === "year" && (
        <YearViewComponent year={yearViewYear} isDarkTheme={isDarkTheme} />
      )}
    </>
  );
}

export default Calendar;
