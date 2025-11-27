class PlannerApp {
  constructor() {
    this.apiBaseUrl = "./planner.php";
    this.currentPlans = [];
    this.currentDate = new Date();
    this.cropData = {
      maize: {
        days: 120,
        name: "Maize",
        tasks: [
          "Soil Preparation",
          "Planting",
          "First Weeding",
          "Fertilizer Application",
          "Second Weeding",
          "Harvesting",
        ],
      },
      wheat: {
        days: 90,
        name: "Wheat",
        tasks: [
          "Land Preparation",
          "Sowing",
          "First Irrigation",
          "Weeding",
          "Second Irrigation",
          "Harvest",
        ],
      },
      rice: {
        days: 150,
        name: "Rice",
        tasks: [
          "Nursery Preparation",
          "Transplanting",
          "Water Management",
          "Weeding",
          "Fertilizer Application",
          "Harvest",
        ],
      },
      beans: {
        days: 60,
        name: "Beans",
        tasks: ["Land Preparation", "Planting", "Weeding", "Harvest"],
      },
      tomato: {
        days: 90,
        name: "Tomato",
        tasks: [
          "Seedling Preparation",
          "Transplanting",
          "Staking",
          "Pruning",
          "Harvest",
        ],
      },
      potato: {
        days: 110,
        name: "Potato",
        tasks: ["Land Preparation", "Planting", "Earthing Up", "Harvest"],
      },
    };
  }

  async initialize() {
    await this.loadActivePlans();
    this.generateCalendar();
    this.loadUpcomingTasks();
    this.setDefaultPlantingDate();
  }

  setDefaultPlantingDate() {
    const today = new Date();
    const plantingDate = document.getElementById("planting-date");
    if (plantingDate) {
      plantingDate.value = today.toISOString().split("T")[0];
    }
  }

  async createPlan() {
    const cropTypeElem = document.getElementById("crop-type");
    const varietyElem = document.getElementById("variety");
    const plantingDateElem = document.getElementById("planting-date");
    const areaElem = document.getElementById("area");
    const notesElem = document.getElementById("notes");
    const cropType = cropTypeElem ? cropTypeElem.value : "";
    const variety = varietyElem ? varietyElem.value : "";
    const plantingDate = plantingDateElem ? plantingDateElem.value : "";
    const area = areaElem ? areaElem.value : "";
    const notes = notesElem ? notesElem.value : "";

    if (!cropType || !plantingDate || !area) {
      this.showNotification("Please fill in all required fields", "warning");
      return;
    }

    // More validation
    if (isNaN(parseFloat(area)) || parseFloat(area) <= 0) {
      this.showNotification("Area must be a positive number", "warning");
      return;
    }
    // Prevent planting date in the far past
    const todayStr = new Date().toISOString().split("T")[0];
    if (plantingDate < todayStr) {
      this.showNotification("Planting date cannot be in the past", "warning");
      return;
    }

    const cropInfo = this.cropData[cropType];
    if (!cropInfo) {
      this.showNotification("Invalid crop selection", "error");
      return;
    }

    const plan = {
      id: Date.now(),
      crop: cropType,
      variety: variety,
      cropName: cropInfo.name,
      plantingDate: plantingDate,
      area: parseFloat(area),
      notes: notes,
      status: "active",
      created: new Date().toISOString(),
    };

    // Calculate harvest date and tasks
    const harvestDate = new Date(plantingDate);
    harvestDate.setDate(harvestDate.getDate() + cropInfo.days);
    plan.harvestDate = harvestDate.toISOString().split("T")[0];
    plan.duration = cropInfo.days;

    // Generate tasks
    plan.tasks = this.generateTasks(plan, cropInfo);

    try {
      const response = await fetch(this.apiBaseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "save_plan",
          plan: plan,
        }),
      });

      if (response.status === 401) {
        this.showNotification("Please login to save plans", "warning");
        // redirect to login
        window.location.href = "/src/components/reg/index.html";
        return;
      }

      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        console.error("Invalid JSON from planner endpoint:", e);
      }

      if (!data) {
        // Treat as network/server error — fallback to offline save
        throw new Error("Invalid server response");
      }

      if (!data.success) {
        // Server returned an error — show it to the user and do not silently fallback
        this.showNotification(data.error || "Failed to save plan", "error");
        return;
      }

      // Success — use server returned saved plan if present
      const savedPlan = data.data || plan;
      this.currentPlans.unshift(savedPlan);
      this.displayPlanSummary(savedPlan);
      this.displayActivePlans();
      this.loadUpcomingTasks();
      this.generateCalendar();
      this.clearForm();
      this.showNotification("Crop plan created successfully!", "success");
    } catch (error) {
      console.error("Plan creation error:", error);
      // Network or server parse error — fallback to local storage
      this.savePlanToLocal(plan);
      this.displayPlanSummary(plan);
      this.displayActivePlans();
      this.loadUpcomingTasks();
      this.generateCalendar();
      this.clearForm();
      this.showNotification("Crop plan created (offline mode)", "info");
    }
  }

  generateTasks(plan, cropInfo) {
    const plantingDate = new Date(plan.plantingDate);
    const tasks = [];
    const taskIntervals = Math.floor(plan.duration / cropInfo.tasks.length);

    cropInfo.tasks.forEach((taskName, index) => {
      const taskDate = new Date(plantingDate);
      taskDate.setDate(taskDate.getDate() + index * taskIntervals);

      tasks.push({
        id: Date.now() + index,
        name: taskName,
        dueDate: taskDate.toISOString().split("T")[0],
        completed: false,
        priority: index === 0 ? "high" : "medium",
      });
    });

    return tasks;
  }

  displayPlanSummary(plan) {
    const container = document.getElementById("plan-summary");
    const progress = this.calculatePlanProgress(plan);
    if (!container) return;
    container.innerHTML = `
            <div class="plan-summary">
                <h3>${plan.cropName} Plan</h3>
                <p><strong>Variety:</strong> ${plan.variety || "Standard"}</p>
                <p><strong>Area:</strong> ${plan.area} acres</p>
                
                <div class="plan-dates">
                    <div class="date-card">
                        <div class="date-label">Planting Date</div>
                        <div class="date-value">${this.formatDate(
                          plan.plantingDate
                        )}</div>
                    </div>
                    <div class="date-card">
                        <div class="date-label">Expected Harvest</div>
                        <div class="date-value">${this.formatDate(
                          plan.harvestDate
                        )}</div>
                    </div>
                </div>

                <div class="progress-bar" style="margin: 15px 0;">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <div style="text-align: center; color: #666; font-size: 0.9em;">
                    ${progress}% Complete • ${plan.duration} days total
                </div>

                <div class="tasks-list">
                    ${plan.tasks
                      .slice(0, 3)
                      .map(
                        (task) => `
                        <div class="task-item ${
                          task.completed ? "completed" : ""
                        }">
                            <div class="task-icon">${
                              task.completed ? "✅" : "⏳"
                            }</div>
                            <div class="task-content">
                                <div class="task-title">${task.name}</div>
                                <div class="task-due">Due: ${this.formatDate(
                                  task.dueDate
                                )}</div>
                            </div>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `;
  }

  async loadActivePlans() {
    try {
      const response = await fetch(`${this.apiBaseUrl}?action=get_plans`);
      const data = await response.json();

      if (data.success) {
        this.currentPlans = data.data;
      } else {
        // Load from local storage as fallback
        this.loadPlansFromLocal();
      }
    } catch (error) {
      console.error("Failed to load plans:", error);
      this.loadPlansFromLocal();
    }

    this.displayActivePlans();
  }

  displayActivePlans() {
    const container = document.getElementById("active-plans");

    if (this.currentPlans.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🌱</div>
                    <h3>No Active Plans</h3>
                    <p>Create your first crop plan to get started with scheduling.</p>
                </div>
            `;
      return;
    }

    container.innerHTML = `
            <div class="plans-grid">
                ${this.currentPlans
                  .slice(0, 3)
                  .map(
                    (plan) => `
                    <div class="plan-card">
                        <div class="plan-header">
                            <h4>${plan.cropName}</h4>
                            <span class="plan-status ${plan.status}">${
                      plan.status
                    }</span>
                        </div>
                        <div class="plan-details">
                            <p><strong>Area:</strong> ${plan.area} acres</p>
                            <p><strong>Planted:</strong> ${this.formatDate(
                              plan.plantingDate
                            )}</p>
                            <p><strong>Progress:</strong> ${this.calculatePlanProgress(
                              plan
                            )}%</p>
                        </div>
                        <div class="plan-actions">
                            <button onclick="plannerApp.viewPlan(${
                              plan.id
                            })" class="btn-outline btn-small">View</button>
                            <button onclick="plannerApp.completePlan(${
                              plan.id
                            })" class="btn-primary btn-small">Complete</button>
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        `;
  }

  loadUpcomingTasks() {
    const container = document.getElementById("upcoming-tasks");
    const upcomingTasks = this.getUpcomingTasks();

    if (upcomingTasks.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">✅</div>
                    <p>No upcoming tasks. Create a crop plan to see scheduled tasks.</p>
                </div>
            `;
      return;
    }

    container.innerHTML = `
            <div class="tasks-list">
                ${upcomingTasks
                  .map(
                    (task) => `
                    <div class="task-item">
                        <div class="task-icon">${this.getTaskIcon(
                          task.name
                        )}</div>
                        <div class="task-content">
                            <div class="task-title">${task.name}</div>
                            <div class="task-description">For ${
                              task.planName
                            } • ${task.area} acres</div>
                            <div class="task-due">Due: ${this.formatDate(
                              task.dueDate
                            )}</div>
                        </div>
                        <button onclick="plannerApp.completeTask(${
                          task.id
                        })" class="btn-primary btn-small">
                            Complete
                        </button>
                    </div>
                `
                  )
                  .join("")}
            </div>
        `;
  }

  getUpcomingTasks() {
    const tasks = [];
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    this.currentPlans.forEach((plan) => {
      plan.tasks.forEach((task) => {
        if (!task.completed) {
          const dueDate = new Date(task.dueDate);
          if (dueDate >= today && dueDate <= nextWeek) {
            tasks.push({
              ...task,
              planName: plan.cropName,
              area: plan.area,
            });
          }
        }
      });
    });

    // Sort by due date
    return tasks
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
  }

  generateCalendar() {
    const container = document.getElementById("calendar-container");
    const month = this.currentDate.getMonth();
    const year = this.currentDate.getFullYear();

    // Update month display
    document.getElementById("current-month").textContent =
      this.currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDay = firstDay.getDay();

    let calendarHTML = `
            <div class="calendar-grid">
                ${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                  .map(
                    (day) => `
                    <div class="calendar-day header">${day}</div>
                `
                  )
                  .join("")}
        `;

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      calendarHTML += '<div class="calendar-day"></div>';
    }

    // Add days of the month
    const today = new Date();
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === today.toDateString();
      const hasEvents = this.hasEventsOnDate(date);

      calendarHTML += `
                <div class="calendar-day ${isToday ? "today" : ""} ${
        hasEvents ? "has-events" : ""
      }">
                    <div>${day}</div>
                    ${hasEvents ? '<div class="event-dot"></div>' : ""}
                </div>
            `;
    }

    calendarHTML += "</div>";
    container.innerHTML = calendarHTML;
  }

  hasEventsOnDate(date) {
    const dateStr = date.toISOString().split("T")[0];

    for (const plan of this.currentPlans) {
      // Check planting date
      if (plan.plantingDate === dateStr) return true;

      // Check harvest date
      if (plan.harvestDate === dateStr) return true;

      // Check tasks
      for (const task of plan.tasks) {
        if (task.dueDate === dateStr && !task.completed) return true;
      }
    }

    return false;
  }

  calculatePlanProgress(plan) {
    const today = new Date();
    const plantingDate = new Date(plan.plantingDate);
    const harvestDate = new Date(plan.harvestDate);

    const totalDuration = harvestDate - plantingDate;
    const elapsed = today - plantingDate;

    let progress = Math.round((elapsed / totalDuration) * 100);
    return Math.min(100, Math.max(0, progress));
  }

  getTaskIcon(taskName) {
    const icons = {
      Planting: "🌱",
      Harvest: "📅",
      Weeding: "🌿",
      Irrigation: "💧",
      Fertilizer: "🧪",
      Pruning: "✂️",
      Spraying: "💨",
    };
    return icons[taskName] || "✅";
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  clearForm() {
    document.getElementById("crop-type").value = "";
    document.getElementById("variety").value = "";
    document.getElementById("area").value = "1";
    document.getElementById("notes").value = "";
    this.setDefaultPlantingDate();
  }

  // Navigation methods
  previousMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.generateCalendar();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.generateCalendar();
  }

  // Placeholder methods for future implementation
  viewPlan(planId) {
    const plan = this.currentPlans.find((p) => String(p.id) === String(planId));
    if (!plan) return this.showNotification("Plan not found", "warning");

    // render detailed plan in the summary area with edit/delete controls
    const container = document.getElementById("plan-summary");
    if (!container) return;
    container.innerHTML = `
      <div class="plan-detail">
        <h3>${plan.cropName} — ${plan.variety || "Standard"}</h3>
        <p><strong>Area:</strong> ${plan.area} acres</p>
        <p><strong>Planting:</strong> ${this.formatDate(plan.plantingDate)}</p>
        <p><strong>Harvest:</strong> ${this.formatDate(plan.harvestDate)}</p>
        <p><strong>Status:</strong> ${plan.status}</p>
        <p><strong>Notes:</strong> ${plan.notes || ""}</p>
        <div class="plan-actions">
          <button class="btn-primary" onclick="plannerApp.completePlan(${
            plan.id
          })">Mark Complete</button>
          <button class="btn-outline" onclick="plannerApp.showEditForm(${
            plan.id
          })">Edit</button>
          <button class="btn-danger" onclick="plannerApp.deletePlan(${
            plan.id
          })">Delete</button>
        </div>
        <h4>Tasks</h4>
        <div class="tasks-list">
          ${plan.tasks
            .map(
              (t) => `
                <div class="task-item ${t.completed ? "completed" : ""}">
                  <div>${t.name}</div>
                  <div>Due: ${this.formatDate(t.dueDate)}</div>
                  <div>
                    ${
                      t.completed
                        ? ""
                        : `<button onclick="plannerApp.completeTask(${t.id}, ${plan.id})" class="btn-small btn-primary">Complete</button>`
                    }
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  completePlan(planId) {
    // Call API to mark plan completed
    fetch(this.apiBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete_plan", planId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success)
          return this.showNotification(
            data.error || "Failed to complete plan",
            "error"
          );
        // update local plans
        const idx = this.currentPlans.findIndex(
          (p) => String(p.id) === String(planId)
        );
        if (idx !== -1) this.currentPlans[idx] = data.data;
        this.displayActivePlans();
        this.loadUpcomingTasks();
        this.showNotification("Plan marked complete", "success");
      })
      .catch((err) => {
        console.error(err);
        this.showNotification("Network error while completing plan", "error");
      });
  }

  completeTask(taskId, planId) {
    fetch(this.apiBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete_task", planId, taskId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success)
          return this.showNotification(
            data.error || "Failed to complete task",
            "error"
          );
        // update local plan tasks
        const idx = this.currentPlans.findIndex(
          (p) => String(p.id) === String(planId)
        );
        if (idx !== -1) this.currentPlans[idx] = data.data;
        this.displayActivePlans();
        this.loadUpcomingTasks();
        this.showNotification("Task marked complete", "success");
      })
      .catch((err) => {
        console.error(err);
        this.showNotification("Network error while completing task", "error");
      });
  }

  // show a simple inline edit form for a plan
  showEditForm(planId) {
    const plan = this.currentPlans.find((p) => String(p.id) === String(planId));
    if (!plan) return this.showNotification("Plan not found", "warning");
    const container = document.getElementById("plan-summary");
    if (!container) return;
    container.innerHTML = `
      <div class="plan-edit">
        <h3>Edit ${plan.cropName}</h3>
        <label>Area: <input id="edit-area" type="number" value="${
          plan.area
        }" step="0.1" /></label>
        <label>Notes: <textarea id="edit-notes">${
          plan.notes || ""
        }</textarea></label>
        <div>
          <button class="btn-primary" onclick="plannerApp.submitEdit(${
            plan.id
          })">Save</button>
          <button class="btn-outline" onclick="plannerApp.viewPlan(${
            plan.id
          })">Cancel</button>
        </div>
      </div>
    `;
  }

  submitEdit(planId) {
    const area = document.getElementById("edit-area").value;
    const notes = document.getElementById("edit-notes").value;
    fetch(this.apiBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "edit_plan",
        plan: { id: planId, area: parseFloat(area), notes },
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success)
          return this.showNotification(
            data.error || "Failed to update plan",
            "error"
          );
        const idx = this.currentPlans.findIndex(
          (p) => String(p.id) === String(planId)
        );
        if (idx !== -1) this.currentPlans[idx] = data.data;
        this.displayActivePlans();
        this.viewPlan(planId);
        this.showNotification("Plan updated", "success");
      })
      .catch((err) => {
        console.error(err);
        this.showNotification("Network error while updating plan", "error");
      });
  }

  deletePlan(planId) {
    if (!confirm("Delete this plan? This cannot be undone.")) return;
    fetch(this.apiBaseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_plan", id: planId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.success)
          return this.showNotification(
            data.error || "Failed to delete plan",
            "error"
          );
        this.currentPlans = this.currentPlans.filter(
          (p) => String(p.id) !== String(planId)
        );
        this.displayActivePlans();
        document.getElementById("plan-summary").innerHTML = "";
        this.showNotification("Plan deleted", "success");
      })
      .catch((err) => {
        console.error(err);
        this.showNotification("Network error while deleting plan", "error");
      });
  }

  showAllPlans() {
    this.showNotification("All plans view - to be implemented", "info");
  }

  // Local storage fallback
  savePlanToLocal(plan) {
    const plans = JSON.parse(localStorage.getItem("cropPlans") || "[]");
    plans.push(plan);
    localStorage.setItem("cropPlans", JSON.stringify(plans));
    this.currentPlans = plans;
  }

  loadPlansFromLocal() {
    const plans = JSON.parse(localStorage.getItem("cropPlans") || "[]");
    this.currentPlans = plans;
  }

  showNotification(message, type) {
    console.log(`${type}: ${message}`);
  }
}
