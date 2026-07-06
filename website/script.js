const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const dialog = document.querySelector("#notice-dialog");
const dialogTitle = document.querySelector("#dialog-title");
const dialogCopy = document.querySelector("#dialog-copy");

function showNotice(title, copy) {
  dialogTitle.textContent = title;
  dialogCopy.textContent = copy;
  dialog.showModal();
}

document.querySelectorAll("[data-open-login]").forEach((button) => {
  button.addEventListener("click", () => showNotice("登录功能正在准备", "首发版先支持无需登录、直接使用。等云端同步与会员功能确定后，这里会接入正式账号系统。"));
});

document.querySelectorAll("[data-download]").forEach((button) => {
  button.addEventListener("click", () => {
    const platform = button.dataset.download === "ios" ? "iPhone TestFlight" : "Android";
    showNotice(`${platform} 版本正在准备`, "安装包通过第一轮内部测试后，这个按钮会替换为真实下载链接。" );
  });
});

document.querySelectorAll("[data-placeholder]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showNotice(`${link.dataset.placeholder}正在整理`, "正式开放下载前会补全并公开这一页面。" );
  });
});

document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
document.querySelector(".dialog-confirm").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});
