// Tab switching
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".tab, .form")
      .forEach((el) => el.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.target).classList.add("active");
  });
});

// Form submission
document.querySelectorAll(".form").forEach((form) => {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = form.querySelector('.btn[type="submit"]');
    btn.textContent = "✓ Done";
    btn.style.background = "#2d7a4f";
    setTimeout(() => {
      btn.textContent = form.id === "login" ? "Continue" : "Create account";
      btn.style.background = "";
    }, 2000);
  });
});
