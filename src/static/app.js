document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function createParticipantItem(activityName, participant) {
    const participantItem = document.createElement("li");
    participantItem.className = "participant-item";

    const participantName = document.createElement("span");
    participantName.textContent = participant;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-participant";
    removeButton.setAttribute("aria-label", `Cancelar inscrição de ${participant}`);
    removeButton.title = `Cancelar inscrição de ${participant}`;
    removeButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 5v6m4-6v6" />
      </svg>
    `;
    removeButton.addEventListener("click", async () => {
      removeButton.disabled = true;

      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(participant)}`,
          { method: "DELETE" }
        );
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.detail || "Não foi possível cancelar a inscrição.");
        }

        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        await fetchActivities();
      } catch (error) {
        messageDiv.textContent = error.message || "Falha ao cancelar a inscrição.";
        messageDiv.className = "error";
        console.error("Error unregistering participant:", error);
      }

      messageDiv.classList.remove("hidden");
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    });

    participantItem.appendChild(participantName);
    participantItem.appendChild(removeButton);
    return participantItem;
  }

  function addParticipantToCard(activityName, participant) {
    const activityCard = Array.from(activitiesList.querySelectorAll(".activity-card"))
      .find((card) => card.dataset.activityName === activityName);

    if (!activityCard) {
      return false;
    }

    const participantsList = activityCard.querySelector(".participants ul");
    participantsList.querySelector(".empty-participants")?.remove();
    participantsList.appendChild(createParticipantItem(activityName, participant));

    const participantCount = participantsList.querySelectorAll(".participant-item").length;
    activityCard.querySelector(".participant-count").textContent = `(${participantCount})`;
    const spotsLeft = Number(activityCard.dataset.maxParticipants) - participantCount;
    activityCard.querySelector(".spots-left").textContent = `${spotsLeft} spots left`;
    return true;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities", { cache: "no-store" });
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.options.length = 1;

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> <span class="spots-left">${spotsLeft} spots left</span></p>
          <div class="participants">
            <h5>Participantes <span class="participant-count">(${details.participants.length})</span></h5>
            <ul></ul>
          </div>
        `;
        activityCard.dataset.activityName = name;
        activityCard.dataset.maxParticipants = details.max_participants;

        const participantsList = activityCard.querySelector(".participants ul");
        if (details.participants.length === 0) {
          const emptyItem = document.createElement("li");
          emptyItem.className = "empty-participants";
          emptyItem.textContent = "Ainda não há participantes inscritos.";
          participantsList.appendChild(emptyItem);
        }

        details.participants.forEach((participant) => {
          participantsList.appendChild(createParticipantItem(name, participant));
        });

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        if (!addParticipantToCard(activity, email)) {
          await fetchActivities();
        }
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
