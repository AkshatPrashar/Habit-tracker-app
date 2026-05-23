document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    let state = {
        selectedYear: currentYear,
        selectedMonth: currentDate.getMonth(), // Automatically fetches local system month
    };

    let currentScrollYear = state.selectedYear;
    let currentScrollMonth = state.selectedMonth;

    // --- DOM Elements ---
    const calendarGrid = document.getElementById('calendarGrid');
    const selectedDateTitle = document.getElementById('selectedDateTitle');
    const tasksList = document.getElementById('tasksList');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const dailyNotes = document.getElementById('dailyNotes');

    // New DOM Elements
    const triggerIcon = document.getElementById('calendarNavTrigger');
    const headerContainer = document.querySelector('.calendar-header');
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    const goToDateBtn = document.getElementById('goToDateBtn');
    const monthYearDisplay = document.getElementById('currentMonthYearDisplay');
    const detailsPanel = document.getElementById('detailsPanel');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const panelOverlay = document.getElementById('panelOverlay');

    // New Daily Flow Elements
    const timelineContainer = document.getElementById('timelineContainer');
    const planDayBtn = document.getElementById('planDayBtn');
    const dayActionsView = document.getElementById('dayActionsView');
    const backToCalendarBtn = document.getElementById('backToCalendarBtn');
    const dayActionsDateTitle = document.getElementById('dayActionsDateTitle');
    const dayActionsTaskInput = document.getElementById('dayActionsTaskInput');
    const dayActionsAddTaskBtn = document.getElementById('dayActionsAddTaskBtn');
    const dayActionsTasksList = document.getElementById('dayActionsTasksList');
    const dayActionsBlockTitleInput = document.getElementById('dayActionsBlockTitleInput');
    const dayActionsBlockStartInput = document.getElementById('dayActionsBlockStartInput');
    const dayActionsBlockEndInput = document.getElementById('dayActionsBlockEndInput');
    const dayActionsAddBlockBtn = document.getElementById('dayActionsAddBlockBtn');
    const dayActionsTimelineContainer = document.getElementById('dayActionsTimelineContainer');
    const dayActionsNotesInput = document.getElementById('dayActionsNotesInput');
    let dayActionsSelectedDateStr = null;
    const planDayModal = document.getElementById('planDayModal');
    const timeBlockTitleInput = document.getElementById('timeBlockTitleInput');
    const timeBlockStartInput = document.getElementById('timeBlockStartInput');
    const timeBlockEndInput = document.getElementById('timeBlockEndInput');
    const cancelPlanDayBtn = document.getElementById('cancelPlanDayBtn');
    const confirmPlanDayBtn = document.getElementById('confirmPlanDayBtn');

    let currentSelectedDateStr = null;

    let appData = {
        streaks: [],
        todos: [],
        timeBlocks: [],
        notes: "",
        calendarData: {}
    };

    const loadData = () => {
        try {
            const data = localStorage.getItem('habitTrackerData');
            if (data) {
                const parsed = JSON.parse(data);
                appData = { ...appData, ...parsed };
            } else {
                // Migrate old dashboardData if exists
                const oldData = localStorage.getItem('dashboardData');
                if (oldData) {
                    const parsedOld = JSON.parse(oldData);
                    appData.streaks = parsedOld.streaks || [];
                    Object.keys(parsedOld).forEach(key => {
                        if (key !== 'streaks' && key.match(/^\d{4}-\d{2}-\d{2}$/)) {
                            appData.calendarData[key] = parsedOld[key];
                        }
                    });
                    saveData();
                }
            }
        } catch (e) {
            console.error("Corrupted localStorage data, starting fresh", e);
        }

        // Evaluate streaks
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (appData.streaks) {
            appData.streaks.forEach(streak => {
                streak.currentStreak = streak.currentStreak || 0;
                streak.longestStreak = streak.longestStreak || 0;
                streak.pending = true;

                if (streak.lastCheckedDate) {
                    const lastChecked = new Date(streak.lastCheckedDate);
                    lastChecked.setHours(0, 0, 0, 0);
                    const diffTime = today.getTime() - lastChecked.getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays >= 2) {
                        streak.currentStreak = 0;
                        streak.pending = true;
                    } else if (diffDays === 1) {
                        streak.pending = true;
                    } else if (diffDays === 0) {
                        streak.pending = false;
                    }
                }
            });
        }
        saveData();
    };

    const saveData = () => {
        try {
            localStorage.setItem('habitTrackerData', JSON.stringify(appData));
        } catch (e) {
            console.error("Failed to save data", e);
        }
    };

    loadData();

    const saveAppData = () => saveData();

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const getDateData = (dateStr) => {
        if (!appData.calendarData) appData.calendarData = {};
        if (!appData.calendarData[dateStr]) {
            appData.calendarData[dateStr] = { tasks: [], notes: '', timeBlocks: [] };
        }
        return appData.calendarData[dateStr];
    };

    // 1. Initialization
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
    monthSelect.value = state.selectedMonth;

    for (let year = 2000; year <= currentYear + 10; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
    yearSelect.value = state.selectedYear;

    // 2. Render Calendar
    const renderCalendar = (year, month, append = false) => {
        if (!append) {
            calendarGrid.innerHTML = '';
            monthYearDisplay.innerText = `${months[month]} ${year}`;
        } else {
            const monthHeader = document.createElement('div');
            monthHeader.classList.add('month-separator');
            monthHeader.style.gridColumn = '1 / -1';
            monthHeader.style.textAlign = 'left';
            monthHeader.style.padding = '20px 0 10px 10px';
            monthHeader.style.fontSize = '24px';
            monthHeader.style.fontWeight = 'bold';
            monthHeader.style.color = 'var(--text-primary)';
            monthHeader.innerText = `${months[month]} ${year}`;
            calendarGrid.appendChild(monthHeader);
        }

        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Offset for Monday start
        const startingDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        for (let i = 0; i < startingDayIndex; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.classList.add('day-cell', 'empty-cell');
            calendarGrid.appendChild(emptyCell);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            cell.classList.add('day-cell');

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            cell.dataset.date = dateStr;

            const dayNum = document.createElement('div');
            dayNum.classList.add('day-number');
            dayNum.textContent = day;

            cell.addEventListener('click', () => selectDay(dateStr));
            cell.addEventListener('dblclick', () => openDayActions(dateStr));

            cell.appendChild(dayNum);
            calendarGrid.appendChild(cell);
        }
    };

    // 3. Selection and UI updates
    const selectDay = (dateStr) => {
        currentSelectedDateStr = dateStr;

        document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('active-day'));
        const activeCell = document.querySelector(`.day-cell[data-date="${dateStr}"]`);
        if (activeCell) activeCell.classList.add('active-day');

        // Extract date components safely
        const [y, m, d] = dateStr.split('-');
        selectedDateTitle.textContent = `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;

        refreshDetailsPanel();
    };

    const refreshDetailsPanel = () => {
        if (!currentSelectedDateStr) return;

        const data = getDateData(currentSelectedDateStr);

        tasksList.innerHTML = '';
        data.tasks.forEach((task, index) => {
            const taskItem = document.createElement('label');
            taskItem.classList.add('task-checkbox-wrap');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.done;
            checkbox.addEventListener('change', (e) => toggleTask(index, e.target.checked));

            const checkmark = document.createElement('div');
            checkmark.classList.add('checkmark');

            const taskText = document.createElement('span');
            taskText.classList.add('task-text');
            taskText.textContent = task.text;

            taskItem.appendChild(checkbox);
            taskItem.appendChild(checkmark);
            taskItem.appendChild(taskText);

            tasksList.appendChild(taskItem);
        });

        dailyNotes.value = data.notes || '';

        renderTimeline(data);
    };

    const formatTime12Hr = (timeStr) => {
        const [h, m] = timeStr.split(':');
        let hours = parseInt(h);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${m} ${ampm}`;
    };

    const toggleTimeBlockDone = (id, isDone) => {
        if (!currentSelectedDateStr) return;
        const data = getDateData(currentSelectedDateStr);
        const block = data.timeBlocks.find(b => b.id === id);
        if (block) {
            block.completed = isDone;
            if (isDone) {
                const [sH, sM] = block.startTime.split(':').map(Number);
                const [eH, eM] = block.endTime.split(':').map(Number);
                block.actualDuration = (eH * 60 + eM) - (sH * 60 + sM);
            } else {
                block.actualDuration = 0;
            }
            saveAppData();
            renderTimeline(data);
        }
    };

    const renderTimeline = (data) => {
        if (!timelineContainer) return;
        timelineContainer.innerHTML = '';
        if (!data.timeBlocks || data.timeBlocks.length === 0) {
            timelineContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px; text-align: center; margin-top: 10px;">No blocks planned yet.</p>';
            return;
        }

        data.timeBlocks.forEach(block => {
            const blockDiv = document.createElement('div');
            blockDiv.classList.add('time-block');
            blockDiv.dataset.id = block.id;
            if (block.completed) {
                blockDiv.classList.add('completed');
            }

            const timeStr = `${formatTime12Hr(block.startTime)} - ${formatTime12Hr(block.endTime)}`;

            blockDiv.innerHTML = `
                <div class="block-time">${timeStr}</div>
                <div class="block-title">${block.title}</div>
            `;

            const checkboxWrap = document.createElement('label');
            checkboxWrap.classList.add('task-checkbox-wrap', 'block-checkbox-wrap');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = block.completed;
            checkbox.addEventListener('change', (e) => {
                toggleTimeBlockDone(block.id, e.target.checked);
            });

            const checkmark = document.createElement('div');
            checkmark.classList.add('checkmark');

            checkboxWrap.appendChild(checkbox);
            checkboxWrap.appendChild(checkmark);

            blockDiv.appendChild(checkboxWrap);
            timelineContainer.appendChild(blockDiv);
        });

        updateLiveTimeline();
    };

    let lastNotifiedBlockId = null;

    const updateLiveTimeline = () => {
        if (!currentSelectedDateStr || !timelineContainer || timelineContainer.innerHTML.includes('No blocks planned yet')) return;

        const currentRealDate = new Date();
        const todayStr = `${currentRealDate.getFullYear()}-${String(currentRealDate.getMonth() + 1).padStart(2, '0')}-${String(currentRealDate.getDate()).padStart(2, '0')}`;

        document.querySelectorAll('.active-block').forEach(el => el.classList.remove('active-block'));
        const existingLine = timelineContainer.querySelector('.live-time-indicator');
        if (existingLine) existingLine.remove();

        if (currentSelectedDateStr !== todayStr) return;

        const currentMins = currentRealDate.getHours() * 60 + currentRealDate.getMinutes();
        const data = getDateData(currentSelectedDateStr);
        if (!data.timeBlocks) return;

        let lineTopPosition = -1;
        const blocksDom = timelineContainer.querySelectorAll('.time-block');

        data.timeBlocks.forEach((block, index) => {
            const [sH, sM] = block.startTime.split(':').map(Number);
            const [eH, eM] = block.endTime.split(':').map(Number);
            const startMins = sH * 60 + sM;
            const endMins = eH * 60 + eM;

            if (startMins - currentMins === 10 && lastNotifiedBlockId !== block.id) {
                alert(`Wrap up! Next task "${block.title}" starting soon (${formatTime12Hr(block.startTime)})`);
                lastNotifiedBlockId = block.id;
            }

            if (currentMins >= startMins && currentMins < endMins) {
                const domNode = Array.from(blocksDom).find(el => el.dataset.id === block.id);
                if (domNode) {
                    domNode.classList.add('active-block');
                    const progress = (currentMins - startMins) / Math.max(1, endMins - startMins);
                    lineTopPosition = domNode.offsetTop + (domNode.offsetHeight * progress);
                }
            } else if (currentMins >= endMins && index < data.timeBlocks.length - 1) {
                const [nSH, nSM] = data.timeBlocks[index + 1].startTime.split(':').map(Number);
                if (currentMins < (nSH * 60 + nSM)) {
                    const domNode = Array.from(blocksDom).find(el => el.dataset.id === block.id);
                    if (domNode) {
                        lineTopPosition = domNode.offsetTop + domNode.offsetHeight + 5;
                    }
                }
            }
        });

        if (lineTopPosition >= 0) {
            const line = document.createElement('div');
            line.classList.add('live-time-indicator');
            line.style.top = `${lineTopPosition}px`;
            timelineContainer.appendChild(line);
        }
    };

    setInterval(() => {
        updateLiveTimeline();
    }, 60000);

    const toggleTask = (index, isDone) => {
        if (!currentSelectedDateStr) return;
        getDateData(currentSelectedDateStr).tasks[index].done = isDone;
        saveAppData();
    };

    // 4. Events
    const openDayActions = (dateStr) => {
        dayActionsSelectedDateStr = dateStr;
        calendarView.style.display = 'none';
        streaksView.style.display = 'none';
        if (messagesView) messagesView.style.display = 'none';
        if (dayActionsView) dayActionsView.style.display = 'flex';
        
        const [y, m, d] = dateStr.split('-');
        dayActionsDateTitle.textContent = `${months[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
        refreshDayActionsCards();
    };

    if (backToCalendarBtn) {
        backToCalendarBtn.addEventListener('click', () => {
            if (dayActionsView) dayActionsView.style.display = 'none';
            calendarView.style.display = 'flex';
        });
    }

    const refreshDayActionsCards = () => {
        if (!dayActionsSelectedDateStr) return;
        const data = getDateData(dayActionsSelectedDateStr);

        dayActionsTasksList.innerHTML = '';
        data.tasks.forEach((task, index) => {
            const taskItem = document.createElement('label');
            taskItem.classList.add('task-checkbox-wrap');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.done;
            checkbox.addEventListener('change', (e) => {
                getDateData(dayActionsSelectedDateStr).tasks[index].done = e.target.checked;
                saveAppData();
                refreshDetailsPanel();
            });
            const checkmark = document.createElement('div');
            checkmark.classList.add('checkmark');
            const taskText = document.createElement('span');
            taskText.classList.add('task-text');
            taskText.textContent = task.text;

            taskItem.appendChild(checkbox);
            taskItem.appendChild(checkmark);
            taskItem.appendChild(taskText);
            dayActionsTasksList.appendChild(taskItem);
        });

        if (dayActionsNotesInput) {
            dayActionsNotesInput.value = data.notes || '';
        }

        renderDayActionsTimeline(data);
    };

    const renderDayActionsTimeline = (data) => {
        dayActionsTimelineContainer.innerHTML = '';
        if (!data.timeBlocks || data.timeBlocks.length === 0) {
            dayActionsTimelineContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">No blocks planned yet.</p>';
            return;
        }

        data.timeBlocks.forEach(block => {
            const blockDiv = document.createElement('div');
            blockDiv.classList.add('time-block');
            if (block.completed) blockDiv.classList.add('completed');
            const timeStr = `${formatTime12Hr(block.startTime)} - ${formatTime12Hr(block.endTime)}`;
            blockDiv.innerHTML = `
                <div class="block-time">${timeStr}</div>
                <div class="block-title">${block.title}</div>
            `;
            const checkboxWrap = document.createElement('label');
            checkboxWrap.classList.add('task-checkbox-wrap', 'block-checkbox-wrap');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = block.completed;
            checkbox.addEventListener('change', (e) => {
                const b = getDateData(dayActionsSelectedDateStr).timeBlocks.find(x => x.id === block.id);
                if (b) b.completed = e.target.checked;
                saveAppData();
                renderDayActionsTimeline(data);
                refreshDetailsPanel();
            });
            const checkmark = document.createElement('div');
            checkmark.classList.add('checkmark');
            checkboxWrap.appendChild(checkbox);
            checkboxWrap.appendChild(checkmark);
            blockDiv.appendChild(checkboxWrap);
            dayActionsTimelineContainer.appendChild(blockDiv);
        });
    };

    if (dayActionsAddTaskBtn) {
        dayActionsAddTaskBtn.addEventListener('click', () => {
            if (!dayActionsSelectedDateStr) return;
            const text = dayActionsTaskInput.value;
            if (text && text.trim()) {
                const data = getDateData(dayActionsSelectedDateStr);
                data.tasks.push({ text: text.trim(), done: false });
                saveAppData();
                dayActionsTaskInput.value = '';
                refreshDayActionsCards();
                refreshDetailsPanel();
            }
        });
    }

    if (dayActionsAddBlockBtn) {
        dayActionsAddBlockBtn.addEventListener('click', () => {
            const title = dayActionsBlockTitleInput.value.trim();
            const start = dayActionsBlockStartInput.value;
            const end = dayActionsBlockEndInput.value;

            if (!title || !start || !end) {
                alert("Please fill out all fields.");
                return;
            }
            if (start >= end) {
                alert("End time must be after start time.");
                return;
            }
            if (!dayActionsSelectedDateStr) return;

            const data = getDateData(dayActionsSelectedDateStr);
            const hasConflict = data.timeBlocks.some(block => {
                return (start < block.endTime && end > block.startTime);
            });
            if (hasConflict) {
                alert("⚠️ This overlaps with another time block!");
                return;
            }

            data.timeBlocks.push({
                id: Date.now().toString(),
                title: title,
                startTime: start,
                endTime: end,
                completed: false,
                actualDuration: 0
            });
            data.timeBlocks.sort((a, b) => a.startTime.localeCompare(b.startTime));
            saveAppData();
            
            dayActionsBlockTitleInput.value = '';
            dayActionsBlockStartInput.value = '';
            dayActionsBlockEndInput.value = '';
            
            refreshDayActionsCards();
            refreshDetailsPanel();
        });
    }

    if (planDayBtn) {
        planDayBtn.addEventListener('click', () => {
            planDayModal.style.display = 'flex';
            timeBlockTitleInput.value = '';
            timeBlockStartInput.value = '';
            timeBlockEndInput.value = '';
            timeBlockTitleInput.focus();
        });
    }

    if (cancelPlanDayBtn) {
        cancelPlanDayBtn.addEventListener('click', () => {
            planDayModal.style.display = 'none';
        });
    }

    if (confirmPlanDayBtn) {
        confirmPlanDayBtn.addEventListener('click', () => {
            const title = timeBlockTitleInput.value.trim();
            const start = timeBlockStartInput.value;
            const end = timeBlockEndInput.value;

            if (!title || !start || !end) {
                alert("Please fill out all fields.");
                return;
            }

            if (start >= end) {
                alert("End time must be after start time.");
                return;
            }

            if (!currentSelectedDateStr) return;

            const data = getDateData(currentSelectedDateStr);

            const hasConflict = data.timeBlocks.some(block => {
                return (start < block.endTime && end > block.startTime);
            });

            if (hasConflict) {
                alert("⚠️ This overlaps with another time block!");
                return;
            }

            data.timeBlocks.push({
                id: Date.now().toString(),
                title: title,
                startTime: start,
                endTime: end,
                completed: false,
                actualDuration: 0
            });

            data.timeBlocks.sort((a, b) => a.startTime.localeCompare(b.startTime));

            saveAppData();
            planDayModal.style.display = 'none';

            detailsPanel.classList.add('open');
            if (window.innerWidth <= 768 && panelOverlay) panelOverlay.classList.add('show');
            refreshDetailsPanel();
        });
    }

    if (dayActionsNotesInput) {
        dayActionsNotesInput.addEventListener('input', (e) => {
            if (dayActionsSelectedDateStr) {
                const data = getDateData(dayActionsSelectedDateStr);
                data.notes = e.target.value;
                saveAppData();
                refreshDetailsPanel(); // Keep details panel synced if needed
            }
        });
    }

    triggerIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        headerContainer.classList.toggle('show-selectors');
    });

    const sentinel = document.createElement('div');
    sentinel.id = 'scroll-sentinel';
    sentinel.style.height = '10px';
    sentinel.style.gridColumn = '1 / -1';

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                currentScrollMonth++;
                if (currentScrollMonth > 11) {
                    currentScrollMonth = 0;
                    currentScrollYear++;
                }

                observer.unobserve(sentinel);
                if (sentinel.parentNode) sentinel.parentNode.removeChild(sentinel);

                renderCalendar(currentScrollYear, currentScrollMonth, true);

                calendarGrid.appendChild(sentinel);
                observer.observe(sentinel);
            }
        });
    }, {
        root: calendarGrid,
        rootMargin: '100px',
        threshold: 0.1
    });

    goToDateBtn.addEventListener('click', () => {
        state.selectedYear = parseInt(yearSelect.value);
        state.selectedMonth = parseInt(monthSelect.value);
        currentScrollYear = state.selectedYear;
        currentScrollMonth = state.selectedMonth;

        renderCalendar(state.selectedYear, state.selectedMonth, false);
        headerContainer.classList.remove('show-selectors');

        calendarGrid.appendChild(sentinel);
        observer.observe(sentinel);

        // Select day 1 automatically
        const dateStr = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}-01`;
        selectDay(dateStr);
    });

    addTaskBtn.addEventListener('click', () => {
        if (!currentSelectedDateStr) return;
        const input = document.getElementById('newTaskInput');
        const text = input.value;
        if (text && text.trim()) {
            const data = getDateData(currentSelectedDateStr);
            data.tasks.push({ text: text.trim(), done: false });
            saveAppData();
            input.value = '';
            refreshDetailsPanel();
        }
    });

    document.getElementById('saveNotesBtn').addEventListener('click', () => {
        if (currentSelectedDateStr) {
            const data = getDateData(currentSelectedDateStr);
            data.notes = dailyNotes.value;
            saveAppData();
            alert(`Tasks & Notes Saved for ${selectedDateTitle.textContent}!`);
        }
    });

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => {
            detailsPanel.classList.remove('open');
            if (panelOverlay) panelOverlay.classList.remove('show');
        });
    }

    if (panelOverlay) {
        panelOverlay.addEventListener('click', () => {
            detailsPanel.classList.remove('open');
            panelOverlay.classList.remove('show');
        });
    }

    // Initialize
    renderCalendar(state.selectedYear, state.selectedMonth, false);
    calendarGrid.appendChild(sentinel);
    observer.observe(sentinel);

    // Auto-select today's precise local date rather than forcing the 1st
    const initialDateStr = `${state.selectedYear}-${String(state.selectedMonth + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    selectDay(initialDateStr);

    // --- STREAKS MODULE LOGIC ---
    if (!appData.streaks) {
        appData.streaks = [];
        saveAppData();
    }

    const navCalendarBtn = document.getElementById('navCalendarBtn');
    const navStreaksBtn = document.getElementById('navStreaksBtn');
    const calendarView = document.getElementById('calendarView');
    const streaksView = document.getElementById('streaksView');
    const streaksContainer = document.getElementById('streaksContainer');

    const navMessagesBtn = document.getElementById('navMessagesBtn');
    const messagesView = document.getElementById('messagesView');
    const messagesContainer = document.getElementById('messagesContainer');

    const forgeNewStreakBtn = document.getElementById('forgeNewStreakBtn');
    const forgeModal = document.getElementById('forgeModal');
    const cancelForgeBtn = document.getElementById('cancelForgeBtn');
    const confirmForgeBtn = document.getElementById('confirmForgeBtn');
    const streakNameInput = document.getElementById('streakNameInput');
    const colorSwatches = document.querySelectorAll('.color-swatch');

    const deleteStreakModal = document.getElementById('deleteStreakModal');
    const cancelDeleteStreakBtn = document.getElementById('cancelDeleteStreakBtn');
    const confirmDeleteStreakBtn = document.getElementById('confirmDeleteStreakBtn');
    let streakToDeleteId = null;

    let selectedStreakColor = '#00E5FF';

    if (navCalendarBtn && navStreaksBtn) {
        navCalendarBtn.addEventListener('click', () => {
            navCalendarBtn.classList.add('active');
            navStreaksBtn.classList.remove('active');
            if (navMessagesBtn) navMessagesBtn.classList.remove('active');
            calendarView.style.display = 'flex';
            streaksView.style.display = 'none';
            if (messagesView) messagesView.style.display = 'none';
            if (dayActionsView) dayActionsView.style.display = 'none';
            if (typeof aiChatView !== 'undefined' && aiChatView) aiChatView.style.display = 'none';
        });

        navStreaksBtn.addEventListener('click', () => {
            navStreaksBtn.classList.add('active');
            navCalendarBtn.classList.remove('active');
            if (navMessagesBtn) navMessagesBtn.classList.remove('active');
            calendarView.style.display = 'none';
            streaksView.style.display = 'flex';
            if (messagesView) messagesView.style.display = 'none';
            if (dayActionsView) dayActionsView.style.display = 'none';
            if (typeof aiChatView !== 'undefined' && aiChatView) aiChatView.style.display = 'none';
            detailsPanel.classList.remove('open');
            if (panelOverlay) panelOverlay.classList.remove('show');
            renderStreaks();
        });

        if (navMessagesBtn) {
            navMessagesBtn.addEventListener('click', () => {
                navMessagesBtn.classList.add('active');
                navCalendarBtn.classList.remove('active');
                navStreaksBtn.classList.remove('active');
                calendarView.style.display = 'none';
                streaksView.style.display = 'none';
                if (messagesView) messagesView.style.display = 'flex';
                if (dayActionsView) dayActionsView.style.display = 'none';
                if (typeof aiChatView !== 'undefined' && aiChatView) aiChatView.style.display = 'none';
                detailsPanel.classList.remove('open');
                if (panelOverlay) panelOverlay.classList.remove('show');
                renderMessages();
            });
        }
    }

    forgeNewStreakBtn.addEventListener('click', () => {
        streakNameInput.value = '';
        forgeModal.style.display = 'flex';
        streakNameInput.focus();
    });

    cancelForgeBtn.addEventListener('click', () => {
        forgeModal.style.display = 'none';
    });

    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            colorSwatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            selectedStreakColor = swatch.dataset.color;
        });
    });

    confirmForgeBtn.addEventListener('click', () => {
        const name = streakNameInput.value.trim();
        const typeEl = document.querySelector('input[name="streakType"]:checked');
        const streakType = typeEl ? typeEl.value : 'habit';
        if (name) {
            appData.streaks.push({
                id: Date.now().toString(),
                name: name,
                type: streakType,
                color: selectedStreakColor,
                startDate: new Date().toISOString().split('T')[0],
                history: {},
                questionData: {},
                currentStreak: 0,
                longestStreak: 0,
                lastCheckedDate: null,
                pending: true
            });
            saveAppData();
            forgeModal.style.display = 'none';
            renderStreaks();
        }
    });

    if (cancelDeleteStreakBtn) {
        cancelDeleteStreakBtn.addEventListener('click', () => {
            deleteStreakModal.style.display = 'none';
            streakToDeleteId = null;
        });
    }

    if (confirmDeleteStreakBtn) {
        confirmDeleteStreakBtn.addEventListener('click', () => {
            if (streakToDeleteId) {
                appData.streaks = appData.streaks.filter(s => s.id !== streakToDeleteId);
                saveAppData();
                renderStreaks();
                deleteStreakModal.style.display = 'none';
                streakToDeleteId = null;
            }
        });
    }

    const formatStreakDate = (date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const getStreakStats = (streak) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let currentStreak = 0;
        let longestStreak = 0;
        let activeDays = 0;
        let tempStreak = 0;

        const start = new Date(streak.startDate);
        start.setHours(0, 0, 0, 0);

        const totalDays = Math.max(1, Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1);

        let checkDate = new Date(start);
        while (checkDate <= today) {
            const dateStr = formatStreakDate(checkDate);
            if (streak.history[dateStr] > 0) {
                activeDays++;
                tempStreak++;
                longestStreak = Math.max(longestStreak, tempStreak);
            } else {
                if (checkDate.getTime() !== today.getTime()) {
                    tempStreak = 0;
                }
            }
            checkDate.setDate(checkDate.getDate() + 1);
        }

        currentStreak = tempStreak;
        const completionRate = Math.round((activeDays / totalDays) * 100);

        // Override with new persistence logic if available
        if (streak.lastCheckedDate !== undefined) {
            currentStreak = streak.currentStreak || 0;
            longestStreak = streak.longestStreak || 0;
        }

        return { currentStreak, longestStreak, completionRate };
    };

    let streakCharts = {};
    let globalChart = null;

    const getStreakChartData = (streak, days = 14) => {
        const labels = [];
        const data = [];
        const today = new Date();
        today.setHours(0,0,0,0);
        
        for(let i = days - 1; i >= 0; i--) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateStr = formatStreakDate(checkDate);
            labels.push(checkDate.toLocaleDateString('en-US', { weekday: 'short' }));
            
            const startOfStreak = new Date(streak.startDate);
            startOfStreak.setHours(0,0,0,0);
            if (checkDate < startOfStreak) {
                data.push(0);
            } else {
                if (streak.type === 'study') {
                    data.push(streak.questionData && streak.questionData[dateStr] ? streak.questionData[dateStr] : 0);
                } else {
                    data.push((streak.history[dateStr] || 0) > 0 ? 1 : 0);
                }
            }
        }
        return { labels, data };
    };

    const analyzeOverallConsistency = (combinedHabits, combinedQuestions, hasStudy) => {
        const aiSummary = document.getElementById('aiSummary');
        if (!aiSummary) return;

        if (hasStudy) {
            const dataArray = combinedQuestions;
            const recent = dataArray.slice(-3).reduce((acc, val) => acc + val, 0);
            const previous = dataArray.slice(-6, -3).reduce((acc, val) => acc + val, 0);
            
            let text = "";
            if (recent > 120) {
                text = "🔥 High productivity today!";
            } else if (recent > previous && recent > 30) {
                text = "📈 You're improving!";
            } else if (recent < previous && recent > 0) {
                text = "📉 Your performance dropped today.";
            } else if (recent === 0 && previous > 0) {
                text = "⚠️ Try increasing your practice.";
            } else if (recent > 40) {
                text = "🔥 High productivity today!";
            } else {
                text = "⚠️ Try increasing your practice.";
            }
            aiSummary.innerText = text;
        } else {
            const dataArray = combinedHabits;
            const totalActive = dataArray.reduce((acc, val) => acc + val, 0);
            const possibleMax = dataArray.length * appData.streaks.length;
            const rate = possibleMax === 0 ? 0 : (totalActive / possibleMax);
            
            const recent = dataArray.slice(-3).reduce((acc, val) => acc + val, 0);
            const previous = dataArray.slice(-6, -3).reduce((acc, val) => acc + val, 0);

            let text = "";
            if (rate > 0.8) {
                text = "🔥 Momentum is soaring! You've been highly consistent across all habits.";
            } else if (rate > 0.4 && recent >= previous) {
                text = "📈 You're finding your groove. Stay focused.";
            } else if (rate > 0.4 && recent < previous) {
                text = "⚠️ Your discipline is slipping slightly compared to last week.";
            } else {
                text = "⚠️ You're missing several elements recently. Try narrowing your load.";
            }
            aiSummary.innerText = text;
        }
    };

    const renderGlobalAnalytics = () => {
        const globalPanel = document.getElementById('globalAnalyticsPanel');
        if (!globalPanel) return;

        if (!appData.streaks || appData.streaks.length === 0) {
            globalPanel.style.display = 'none';
            return;
        }
        
        globalPanel.style.display = 'block';

        const days = 14;
        const labels = [];
        const combinedHabits = new Array(days).fill(0);
        const combinedQuestions = new Array(days).fill(0);
        let hasStudy = false;
        
        const today = new Date();
        today.setHours(0,0,0,0);
        
        for(let i = days - 1; i >= 0; i--) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            labels.push(checkDate.toLocaleDateString('en-US', { weekday: 'short' }));
            
            const dateStr = formatStreakDate(checkDate);
            appData.streaks.forEach(streak => {
                const startOfStreak = new Date(streak.startDate);
                startOfStreak.setHours(0,0,0,0);
                if (checkDate >= startOfStreak) {
                    if (streak.type === 'study') {
                        hasStudy = true;
                        if (streak.questionData && streak.questionData[dateStr]) {
                            combinedQuestions[days - 1 - i] += streak.questionData[dateStr];
                        }
                    } else {
                        if ((streak.history[dateStr] || 0) > 0) {
                            combinedHabits[days - 1 - i]++;
                        }
                    }
                }
            });
        }

        analyzeOverallConsistency(combinedHabits, combinedQuestions, hasStudy);

        const oc = document.getElementById('overallChart');
        if (globalChart) globalChart.destroy();

        const datasets = [];
        if (hasStudy) {
            datasets.push({
                label: 'Study Output (Questions)',
                data: combinedQuestions,
                backgroundColor: 'rgba(213, 0, 249, 0.5)',
                borderColor: '#D500F9',
                borderWidth: 1,
                borderRadius: 4
            });
        }
        
        datasets.push({
            label: 'Habits Clocked',
            data: combinedHabits,
            backgroundColor: 'rgba(0, 229, 255, 0.5)',
            borderColor: '#00E5FF',
            borderWidth: 1,
            borderRadius: 4
        });

        if (oc) {
            globalChart = new Chart(oc, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            ticks: { precision: 0, color: 'rgba(255,255,255,0.5)' },
                            grid: { color: 'rgba(255,255,255,0.05)' }
                        },
                        x: { 
                            ticks: { color: 'rgba(255,255,255,0.5)' },
                            grid: { display: false },
                            stacked: true
                        }
                    },
                    plugins: {
                        legend: { display: true, labels: { color: 'white' } }
                    }
                }
            });
        }
    };

    const renderStreaks = (animId = null, runCountAnim = false) => {
        streaksContainer.innerHTML = '';

        if (appData.streaks.length === 0) {
            streaksContainer.innerHTML = '<p style="color: var(--text-muted); text-align: center; margin-top: 50px;">No forging started yet. Begin your journey.</p>';
            return;
        }

        appData.streaks.forEach((streak, streakIndex) => {
            const stats = getStreakStats(streak);
            const todayStr = formatStreakDate(new Date());
            const isClockedToday = (streak.history[todayStr] || 0) > 0;

            const card = document.createElement('div');
            card.classList.add('streak-card');

            card.innerHTML = `
                <button class="delete-streak-btn" data-id="${streak.id}">
                    <span class="material-symbols-outlined" style="font-size: 20px;">delete</span>
                </button>
                <div class="streak-info">
                    <div class="streak-title">
                        <h2>${streak.name}</h2>
                    </div>
                    ${streak.type === 'study' ? `
                        <div class="daily-questions">
                            Today: <span>${streak.questionData && streak.questionData[todayStr] ? streak.questionData[todayStr] : 0} questions</span>
                        </div>
                        <button class="clock-in-btn study-btn" style="background: transparent; color: ${streak.color}; border-color: ${streak.color} !important;">
                            SOLVED +1
                        </button>
                    ` : `
                        <button class="clock-in-btn ${isClockedToday ? 'clocked' : ''}" style="${!isClockedToday ? `background: ${streak.color}; color: #090a0f;` : ''}">
                            ${isClockedToday ? 'CLOCKED IN' : 'CLOCK IN TODAY'}
                        </button>
                    `}
                    <div class="streak-stats">
                        <div class="stat-row"><span class="stat-label">🔥 Current Streak</span><span class="stat-value count-up" data-target="${stats.currentStreak}">0 Days</span></div>
                        <div class="stat-row"><span class="stat-label">🏆 Longest</span><span class="stat-value count-up" data-target="${stats.longestStreak}">0 Days</span></div>
                        <div class="stat-row"><span class="stat-label">⚡ Completion</span><span class="stat-value count-up" data-postfix="%" data-target="${stats.completionRate}">0%</span></div>
                    </div>
                    <div class="streak-chart-container">
                        <canvas id="chart-${streak.id}"></canvas>
                    </div>
                </div>
                <div class="heatmap-wrapper">
                </div>
            `;
            streaksContainer.appendChild(card);

            const heatmapWrapper = card.querySelector('.heatmap-wrapper');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startOfStreak = new Date(streak.startDate);
            startOfStreak.setHours(0, 0, 0, 0);

            for (let mOffset = 2; mOffset >= 0; mOffset--) {
                const renderMonth = new Date(today.getFullYear(), today.getMonth() - mOffset, 1);
                const y = renderMonth.getFullYear();
                const m = renderMonth.getMonth();
                const monthName = months[m];

                const monthContainer = document.createElement('div');
                monthContainer.classList.add('streak-month-block');

                const monthTitle = document.createElement('div');
                monthTitle.classList.add('streak-month-title');
                monthTitle.innerText = `${monthName} ${y}`;
                monthContainer.appendChild(monthTitle);

                const weekdaysLabel = document.createElement('div');
                weekdaysLabel.classList.add('streak-weekdays');
                weekdaysLabel.innerHTML = '<span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>';
                monthContainer.appendChild(weekdaysLabel);

                const grid = document.createElement('div');
                grid.classList.add('streak-calendar-grid');

                const firstDayIndex = new Date(y, m, 1).getDay();
                const daysInMonth = new Date(y, m + 1, 0).getDate();

                for (let i = 0; i < firstDayIndex; i++) {
                    const empty = document.createElement('div');
                    grid.appendChild(empty);
                }

                for (let day = 1; day <= daysInMonth; day++) {
                    const currentLoopDate = new Date(y, m, day);
                    const dateStr = formatStreakDate(currentLoopDate);

                    const cell = document.createElement('div');
                    cell.classList.add('streak-cell');

                    if (currentLoopDate > today || currentLoopDate < startOfStreak) {
                        cell.classList.add('future');
                    } else {
                        if ((streak.history[dateStr] || 0) > 0) {
                            cell.classList.add('active');
                            if (streak.type === 'study') {
                                const count = streak.questionData ? (streak.questionData[dateStr] || 0) : 0;
                                let intensity = Math.min(count / 50, 1);
                                cell.style.background = `linear-gradient(135deg, ${streak.color}, rgba(255, 61, 0, ${intensity}))`;
                                if (count >= 30) {
                                    cell.style.boxShadow = `0 0 15px ${streak.color}`;
                                } else if (count >= 10) {
                                    cell.style.boxShadow = `0 0 5px ${streak.color}`;
                                } else {
                                    cell.style.opacity = '0.6';
                                    cell.style.boxShadow = 'none';
                                }
                                cell.dataset.tooltip = `${monthName} ${day}: ${count} Questions`;
                            } else {
                                cell.style.setProperty('--streak-color', streak.color);
                                cell.dataset.tooltip = `${monthName} ${day}: ${streak.name} Clocked`;
                            }
                            if (currentLoopDate.getTime() === today.getTime() && animId === streak.id) {
                                cell.classList.add('pop-anim');
                            }
                        } else {
                            cell.classList.add('missed');
                            cell.innerHTML = '✕';
                            cell.dataset.tooltip = `${monthName} ${day}: Missed`;
                        }
                    }
                    grid.appendChild(cell);
                }
                monthContainer.appendChild(grid);
                heatmapWrapper.appendChild(monthContainer);
            }

            const canvasObj = card.querySelector('#chart-' + streak.id);
            if (streakCharts[streak.id]) {
                streakCharts[streak.id].destroy();
            }
            const chartData = getStreakChartData(streak);
            if (canvasObj) {
                streakCharts[streak.id] = new Chart(canvasObj, {
                    type: streak.type === 'study' ? 'bar' : 'line',
                    data: {
                        labels: chartData.labels,
                        datasets: [{
                            label: streak.type === 'study' ? 'Questions Solved Per Day' : 'Consistency',
                            data: chartData.data,
                            borderColor: streak.color,
                            backgroundColor: streak.color + '20',
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true,
                            pointRadius: 2,
                            pointHitRadius: 10
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: { display: false, min: 0, max: streak.type === 'study' ? undefined : 1.2 },
                            x: { display: false }
                        },
                        plugins: { legend: { display: false }, tooltip: { enabled: false } },
                        interaction: { mode: 'index', intersect: false }
                    }
                });
            }

            const deleteBtn = card.querySelector('.delete-streak-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    streakToDeleteId = streak.id;
                    deleteStreakModal.style.display = 'flex';
                });
            }

            const btn = card.querySelector('.clock-in-btn');
            const updateStreakStatsOnClockIn = () => {
                if (streak.pending !== false) {
                    streak.currentStreak = (streak.currentStreak || 0) + 1;
                    if (streak.currentStreak > (streak.longestStreak || 0)) {
                        streak.longestStreak = streak.currentStreak;
                    }
                    streak.lastCheckedDate = new Date().toISOString();
                    streak.pending = false;
                }
            };

            if (streak.type === 'study') {
                btn.addEventListener('click', () => {
                    streak.history[todayStr] = 1;
                    streak.questionData = streak.questionData || {};
                    streak.questionData[todayStr] = (streak.questionData[todayStr] || 0) + 1;
                    updateStreakStatsOnClockIn();
                    saveAppData();
                    renderStreaks(streak.id, false);
                });
            } else {
                if (!isClockedToday) {
                    btn.addEventListener('click', () => {
                        streak.history[todayStr] = (streak.history[todayStr] || 0) + 1;
                        updateStreakStatsOnClockIn();
                        saveAppData();
                        renderStreaks(streak.id, true);
                    });
                } else {
                    btn.addEventListener('click', () => {
                        streak.history[todayStr] = streak.history[todayStr] + 1;
                        saveAppData();
                        renderStreaks(streak.id, true);
                    });
                }
            }

            if (runCountAnim && animId === streak.id) {
                const counters = card.querySelectorAll('.count-up');
                counters.forEach(counter => {
                    counter.innerText = '0' + (counter.dataset.postfix || ' Days');
                    const target = +counter.getAttribute('data-target');
                    if (target > 0) {
                        const speed = 400;
                        const inc = target / (speed / 16);
                        let c = 0;
                        const updateCount = () => {
                            c += inc;
                            if (c < target) {
                                counter.innerText = Math.ceil(c) + (counter.dataset.postfix || ' Days');
                                requestAnimationFrame(updateCount);
                            } else {
                                counter.innerText = target + (counter.dataset.postfix || ' Days');
                            }
                        };
                        updateCount();
                    } else {
                        counter.innerText = '0' + (counter.dataset.postfix || ' Days');
                    }
                });
            } else {
                const counters = card.querySelectorAll('.count-up');
                counters.forEach(counter => {
                    counter.innerText = counter.getAttribute('data-target') + (counter.dataset.postfix || ' Days');
                });
            }
        });

        renderGlobalAnalytics();
    };

    const generateMessages = () => {
        const messages = [];
        const todayReal = new Date();
        const todayStr = formatStreakDate(todayReal);

        let yesterdayReal = new Date(todayReal);
        yesterdayReal.setDate(yesterdayReal.getDate() - 1);
        const yesterdayStr = formatStreakDate(yesterdayReal);

        // 1. Check Streaks
        if (appData.streaks && appData.streaks.length > 0) {
            appData.streaks.forEach(streak => {
                const clockedToday = (streak.history[todayStr] || 0) > 0;
                const clockedYesterday = (streak.history[yesterdayStr] || 0) > 0;
                const start = new Date(streak.startDate);
                start.setHours(0, 0, 0, 0);

                if (start <= yesterdayReal && !clockedYesterday) {
                    messages.push({
                        type: "warning",
                        title: "Streak Broken Risk",
                        text: `"${streak.name}" was missed yesterday.`,
                        action: "STREAKS"
                    });
                }

                if (start <= todayReal && !clockedToday) {
                    messages.push({
                        type: "warning",
                        title: "Streak Pending",
                        text: `You haven't clocked "${streak.name}" today.`,
                        action: "STREAKS"
                    });
                }
            });
        }

        // 2. Check Daily Plans
        const dataToday = getDateData(todayStr);
        if (!dataToday.timeBlocks || dataToday.timeBlocks.length === 0) {
            messages.push({
                type: "info",
                title: "Plan Your Day",
                text: "You haven't planned your day yet. Time blocking helps you focus.",
                action: "PLAN"
            });
        } else if (dataToday.timeBlocks.length > 8) {
            messages.push({
                type: "reminder",
                title: "Overloaded Day",
                text: "Your day looks overloaded with time blocks. Consider adding breaks.",
                action: "CALENDAR"
            });
        }

        return messages;
    };

    const renderMessages = async () => {
        if (!messagesContainer) return;
        messagesContainer.innerHTML = '';
        
        // --- AI Coach Card ---
        const todayStr = formatStreakDate(new Date());
        let coachMessage = null;
        
        try {
            const cache = JSON.parse(localStorage.getItem('aiCoachCache'));
            if (cache && cache.date === todayStr && cache.message) {
                coachMessage = cache.message;
            }
        } catch (e) {
            console.error("Failed to parse AI coach cache", e);
        }
        
        const aiCard = document.createElement('div');
        aiCard.classList.add('message-card', 'ai-coach');
        aiCard.innerHTML = `
            <h3><span class="material-symbols-outlined" style="color: #00E5FF;">auto_awesome</span> Your Daily Coach ✨</h3>
            <p style="font-style: italic; color: var(--text-muted);">${coachMessage ? coachMessage : "Thinking..."}</p>
            <div class="ai-label">Powered by Gemini</div>
        `;
        messagesContainer.appendChild(aiCard);

        if (!coachMessage) {
            try {
                const res = await fetch("/.netlify/functions/ai-coach", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ streaks: appData.streaks })
                });
                const data = await res.json();
                coachMessage = data.message || "Keep going — every day counts.";
                localStorage.setItem('aiCoachCache', JSON.stringify({ date: todayStr, message: coachMessage }));
                
                const p = aiCard.querySelector('p');
                p.textContent = coachMessage;
                p.style.fontStyle = "normal";
                p.style.color = "var(--text-primary)";
            } catch (err) {
                console.error("AI Coach fetch error:", err);
                coachMessage = "Keep going — every day counts.";
                const p = aiCard.querySelector('p');
                p.textContent = coachMessage;
                p.style.fontStyle = "normal";
                p.style.color = "var(--text-primary)";
            }
        } else {
            const p = aiCard.querySelector('p');
            p.style.fontStyle = "normal";
            p.style.color = "var(--text-primary)";
        }

        // --- Existing Messages ---
        const msgs = generateMessages();

        if (msgs.length === 0) {
            const noMsgs = document.createElement('p');
            noMsgs.style.color = 'var(--text-muted)';
            noMsgs.style.textAlign = 'center';
            noMsgs.style.marginTop = '50px';
            noMsgs.textContent = 'You are all caught up! No other messages right now.';
            messagesContainer.appendChild(noMsgs);
            return;
        }

        msgs.forEach(msg => {
            const card = document.createElement('div');
            card.classList.add('message-card', msg.type);

            let icon = 'notifications';
            if (msg.type === 'warning') icon = 'warning';
            if (msg.type === 'info') icon = 'lightbulb';
            if (msg.type === 'reminder') icon = 'schedule';

            card.innerHTML = `
                <h3><span class="material-symbols-outlined">${icon}</span> ${msg.title}</h3>
                <p>${msg.text}</p>
            `;

            card.addEventListener('click', () => {
                if (msg.action === 'STREAKS') {
                    navStreaksBtn.click();
                } else if (msg.action === 'PLAN' || msg.action === 'CALENDAR') {
                    navCalendarBtn.click();
                    const currentRealDate = new Date();
                    const todayStr = formatStreakDate(currentRealDate);
                    selectDay(todayStr);
                    if (msg.action === 'PLAN') {
                        planDayModal.style.display = 'flex';
                        timeBlockTitleInput.value = '';
                        timeBlockStartInput.value = '';
                        timeBlockEndInput.value = '';
                        timeBlockTitleInput.focus();
                    }
                }
            });

            messagesContainer.appendChild(card);
        });
    };
    // --- AI Chat Logic ---
    const aiBubbleBtn = document.getElementById('aiBubbleBtn');
    const aiChatView = document.getElementById('aiChatView');
    const aiChatBackBtn = document.getElementById('aiChatBackBtn');
    const aiChatClearBtn = document.getElementById('aiChatClearBtn');
    const aiChatMessages = document.getElementById('aiChatMessages');
    const aiChatInput = document.getElementById('aiChatInput');
    const aiChatSendBtn = document.getElementById('aiChatSendBtn');
    
    let conversationHistory = [];
    let previousViewForChat = null;

    const renderChatMessages = () => {
        aiChatMessages.innerHTML = '';
        conversationHistory.forEach(msg => {
            const bubble = document.createElement('div');
            bubble.classList.add('chat-bubble', msg.role);
            bubble.innerHTML = `
                <div>${msg.text.replace(/\n/g, '<br>')}</div>
                <span class="chat-time">${msg.time}</span>
            `;
            aiChatMessages.appendChild(bubble);
        });
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    };

    const addWelcomeMessage = () => {
        if (conversationHistory.length === 0) {
            const now = new Date();
            const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            conversationHistory.push({
                role: 'ai',
                text: "Hey! I'm your Streak Coach. Ask me anything — about your habits, streaks, or how to improve. I can see your data.",
                time: timeStr
            });
            renderChatMessages();
        }
    };

    const getActiveView = () => {
        if (calendarView.style.display !== 'none') return calendarView;
        if (streaksView.style.display !== 'none') return streaksView;
        if (messagesView && messagesView.style.display !== 'none') return messagesView;
        if (typeof dayActionsView !== 'undefined' && dayActionsView && dayActionsView.style.display !== 'none') return dayActionsView;
        return calendarView; // fallback
    };

    console.log('Bubble found:', aiBubbleBtn);
    if (aiBubbleBtn) {
        aiBubbleBtn.addEventListener('click', () => {
            console.log('Bubble clicked!');
            previousViewForChat = getActiveView();
            calendarView.style.display = 'none';
            streaksView.style.display = 'none';
            if (messagesView) messagesView.style.display = 'none';
            if (typeof dayActionsView !== 'undefined' && dayActionsView) dayActionsView.style.display = 'none';
            aiChatView.style.display = 'flex';
            document.body.classList.add('chat-open');
            addWelcomeMessage();
        });
    }

    if (aiChatBackBtn) {
        aiChatBackBtn.addEventListener('click', () => {
            aiChatView.style.display = 'none';
            document.body.classList.remove('chat-open');
            if (previousViewForChat) {
                previousViewForChat.style.display = 'flex';
            } else {
                calendarView.style.display = 'flex';
            }
        });
    }

    if (aiChatClearBtn) {
        aiChatClearBtn.addEventListener('click', () => {
            conversationHistory = [];
            addWelcomeMessage();
        });
    }

    const sendChatMessage = async () => {
        const text = aiChatInput.value.trim();
        if (!text) return;

        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        
        conversationHistory.push({ role: 'user', text, time: timeStr });
        aiChatInput.value = '';
        renderChatMessages();

        // Add typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('chat-typing');
        typingIndicator.innerHTML = '<span></span><span></span><span></span>';
        aiChatMessages.appendChild(typingIndicator);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;

        try {
            const res = await fetch("/.netlify/functions/ai-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: conversationHistory, streakData: appData.streaks })
            });
            const data = await res.json();
            
            aiChatMessages.removeChild(typingIndicator);
            
            const aiNow = new Date();
            const aiTimeStr = aiNow.getHours().toString().padStart(2, '0') + ':' + aiNow.getMinutes().toString().padStart(2, '0');
            conversationHistory.push({ role: 'ai', text: data.reply || "Sorry, no response.", time: aiTimeStr });
            renderChatMessages();
        } catch (e) {
            aiChatMessages.removeChild(typingIndicator);
            const errNow = new Date();
            const errTimeStr = errNow.getHours().toString().padStart(2, '0') + ':' + errNow.getMinutes().toString().padStart(2, '0');
            conversationHistory.push({ role: 'ai', text: "Sorry, I couldn't connect right now. Try again in a moment.", time: errTimeStr });
            renderChatMessages();
        }
    };

    if (aiChatSendBtn) {
        aiChatSendBtn.addEventListener('click', sendChatMessage);
    }

    if (aiChatInput) {
        aiChatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
    if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
    }

});