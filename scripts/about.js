"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const aboutImages = document.querySelectorAll("[data-about-image]");

  aboutImages.forEach((image) => {
    const frame = image.closest(
      ".about-hero__image-frame, " +
      ".about-experience__image-frame, " +
      ".about-gallery__image-frame"
    );

    // اگر قاب تصویر پیدا نشد، این تصویر را رد کن.
    if (!frame) {
      return;
    }

    // تشخیص موفقیت یا شکست بارگذاری تصویر
    const updateImageState = () => {
      const isLoaded = image.complete && image.naturalWidth > 0;

      frame.classList.toggle("is-loaded", isLoaded);
    };

    image.addEventListener("load", updateImageState);
    image.addEventListener("error", updateImageState);

    // رسیدگی به تصاویری که پیش از اجرای کد بارگذاری شده‌اند
    if (image.complete) {
      updateImageState();
    }
  });
});