const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -30px" });

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("visible"));
}

window.addEventListener("pageshow", () => {
  document.querySelectorAll(".brand-intro .reveal, .hero .reveal").forEach((item) => item.classList.add("visible"));
});

const intro = document.querySelector(".brand-intro");
const mobileDownload = document.querySelector(".mobile-download");
const downloadSection = document.querySelector("#download");

if (intro && mobileDownload && "IntersectionObserver" in window) {
  const downloadObserver = new IntersectionObserver(([entry]) => {
    document.body.classList.toggle("past-intro", !entry.isIntersecting);
  }, { threshold: 0.12 });

  downloadObserver.observe(intro);
} else if (mobileDownload) {
  document.body.classList.add("past-intro");
}

if (downloadSection && mobileDownload && "IntersectionObserver" in window) {
  const downloadSectionObserver = new IntersectionObserver(([entry]) => {
    document.body.classList.toggle("at-download", entry.isIntersecting);
  }, { threshold: 0.12 });

  downloadSectionObserver.observe(downloadSection);
}
